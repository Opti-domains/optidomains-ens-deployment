package main

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/math"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/pbkdf2"
)

const THREAD_COUNT = 16

var (
	ImmutableCreate2FactoryAddress = common.HexToAddress("0x0000000000ffe8b47b3e2130213b802212439497")
)

type DeploymentAction struct {
	Type                 string        `json:"type"`
	Name                 string        `json:"name"`
	Artifact             string        `json:"artifact"`
	ConstructorArguments []interface{} `json:"constructorArguments"`
	ParsedArguments      []interface{} `json:"parsedArguments"`
	Leading              string        `json:"leading"`
	Salt                 string        `json:"salt"`
	ContractAddress      string        `json:"contractAddress"`
	Deployments          []interface{} `json:"deployments"`
}

func resolveAddress(dict map[string]string, data interface{}) interface{} {
	// fmt.Println(data)
	switch d := data.(type) {
	case string:
		if strings.HasPrefix(d, "<") && strings.HasSuffix(d, ">") {
			key := d[1 : len(d)-1]
			if val, ok := dict[key]; ok {
				// fmt.Println(key, val)
				return val
			}
			fmt.Printf("Not found %s\n", d)
		}
	case map[string]interface{}:
		for k, v := range d {
			// fmt.Println(k)
			d[k] = resolveAddress(dict, v)
		}
		return d
	case []interface{}:
		for k, v := range d {
			// fmt.Println(k)
			d[k] = resolveAddress(dict, v)
		}
		return d
	case *DeploymentAction:
		parsed := make([]interface{}, len(d.ConstructorArguments))
		copy(parsed, d.ConstructorArguments)

		parsed = resolveAddress(dict, parsed).([]interface{})
		d.ParsedArguments = parsed
	}
	return data
}

func loadArtifact(path string) (artifact map[string]interface{}, err error) {
	parts := strings.Split(path, "/")
	filename := parts[len(parts)-1][:len(parts[len(parts)-1])-4]

	data, err := ioutil.ReadFile(filepath.Join("./artifacts/contracts", path, filename+".json"))
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(data, &artifact)
	return artifact, err
}

func buildInitCode(dict map[string]string, action *DeploymentAction) (string, error) {
	actionInterface := resolveAddress(dict, action).(*DeploymentAction)
	artifact, err := loadArtifact(actionInterface.Artifact)
	if err != nil {
		return "", err
	}
	abiData := artifact["abi"].([]interface{})
	var constructorArgs abi.Arguments = []abi.Argument{}
	args := make([]interface{}, 0)
	for _, entry := range abiData {
		e := entry.(map[string]interface{})
		if e["type"] == "constructor" {
			inputs := e["inputs"].([]interface{})
			for _, input := range inputs {
				abiTypeStr := input.(map[string]interface{})["type"].(string)
				abiType, err := abi.NewType(abiTypeStr, "", nil)
				value := actionInterface.ParsedArguments[len(constructorArgs)]
				if err != nil {
					return "", err
				}
				constructorArgs = append(constructorArgs, abi.Argument{
					Type: abiType,
				})

				// fmt.Println(abiTypeStr, value)

				if abiTypeStr == "address" {
					args = append(args, common.HexToAddress(value.(string)))
				} else if abiTypeStr == "bytes" {
					args = append(args, common.Hex2Bytes(value.(string)))
				} else if strings.HasPrefix(abiTypeStr, "bytes") {
					args = append(args, common.HexToHash(value.(string)))
				} else if abiTypeStr == "uint8" {
					args = append(args, uint8(value.(float64)))
				} else if abiTypeStr == "uint16" {
					args = append(args, uint16(value.(float64)))
				} else if abiTypeStr == "uint32" {
					args = append(args, uint32(value.(float64)))
				} else if abiTypeStr == "uint64" {
					args = append(args, uint64(value.(float64)))
				} else if strings.HasPrefix(abiTypeStr, "uint") {
					if floatValue, ok := value.(float64); ok {
						value = strconv.FormatFloat(floatValue, 'f', 0, 64)
					}

					num, ok := math.ParseBig256(value.(string))
					if !ok {
						return "", errors.New("failed to convert string to " + abiTypeStr)
					}
					args = append(args, num)
				} else {
					args = append(args, value)
				}
			}
		}
	}

	if len(constructorArgs) == 0 {
		return artifact["bytecode"].(string), nil
	}

	encodedArgs, err := constructorArgs.Pack(args...)
	if err != nil {
		return "", err
	}

	return artifact["bytecode"].(string) + common.Bytes2Hex(encodedArgs), nil
}

func calculateAddressBySalt(initCodeHash []byte, salt string) string {
	create2Hash := crypto.Keccak256Hash([]byte{0xff}, ImmutableCreate2FactoryAddress.Bytes(), common.FromHex(salt), initCodeHash)

	deploymentAddress := create2Hash.Hex()[len(create2Hash.Hex())-40:]

	address := common.HexToAddress("0x" + deploymentAddress)

	return address.String()
}

func scanSaltAgent(ctx context.Context, initCodeHash []byte, leading string, ch chan string, wg *sync.WaitGroup) {
	defer wg.Done()

	address := ""
	salt := ""

	leadingTemplate := leading[:5]

	for i := 0; i < 100000; i++ {
		saltBytes := make([]byte, 12)
		rand.Read(saltBytes)
		saltHex := hex.EncodeToString(saltBytes)
		salt = "0x0000000000000000000000000000000000000000" + saltHex
		address = calculateAddressBySalt(initCodeHash, salt)
		if strings.HasPrefix(address, "0x"+leadingTemplate) {
			fmt.Println(salt, address)
		}
		if strings.HasPrefix(address, "0x"+leading) {
			select {
			case <-ctx.Done():
				return

			default:
				ch <- (salt + ";" + address)
				return
			}
		}
	}
}

func scanSalt(initCode, leading string) (string, string) {
	initCodeHash := crypto.Keccak256Hash(common.FromHex(initCode)).Bytes()

	for {
		wg := sync.WaitGroup{}
		messageCh := make(chan string)
		notFoundCh := make(chan string)
		ctx, cancel := context.WithCancel(context.Background())

		wg.Add(THREAD_COUNT)

		go func() {
			// Scan with 16 threads
			for i := 0; i < THREAD_COUNT; i++ {
				go scanSaltAgent(ctx, initCodeHash, leading, messageCh, &wg)
			}

			wg.Wait()
			notFoundCh <- "notfound"
		}()

		select {
		case <-notFoundCh:
			cancel()
			continue
		case data := <-messageCh:
			parts := strings.Split(data, ";")
			cancel()
			return parts[0], parts[1]
		}
	}
}

func generateAddressPipeline(dict map[string]string, action *DeploymentAction) error {
	initCode, err := buildInitCode(dict, action)
	// fmt.Println(action.Name)
	// fmt.Println(initCode)
	// fmt.Println("")
	if err != nil {
		fmt.Println("Error building init code:", err)
		return err
	}

	if action.ContractAddress == "" {
		action.Salt, action.ContractAddress = scanSalt(initCode, action.Leading)
	}
	return nil
}

func buildPaths(directory string) ([]string, error) {
	var paths []string // Array to store file and folder paths

	files, err := ioutil.ReadDir(directory)
	if err != nil {
		fmt.Printf("Failed to read directory: %v\n", err)
		return nil, err
	}

	for _, file := range files {
		filePath := filepath.Join(directory, file.Name())

		if file.IsDir() {
			// It's a directory, so recursively read its contents
			subpaths, err := buildPaths(filePath)
			if err != nil {
				return nil, err
			}

			paths = append(paths, subpaths...)
		} else {
			// Add file and folder paths to the array
			paths = append(paths, filePath)
		}
	}

	// Sort the paths array by name
	sort.Strings(paths)

	return paths, nil
}

func processSingle(dict map[string]string, filePath string) error {
	file, err := os.OpenFile(filePath, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	content, err := ioutil.ReadAll(file)
	if err != nil {
		return err
	}

	var jsonData []map[string]interface{}
	err = json.Unmarshal(content, &jsonData)
	if err != nil {
		return fmt.Errorf("error parsing JSON in file %s: %s", filePath, err)
	}

	for key, data := range jsonData {
		if data["type"] == "deployment" {
			x, _ := json.Marshal(data)
			var action DeploymentAction
			err := json.Unmarshal(x, &action)

			if err != nil {
				return err
			}

			err = generateAddressPipeline(dict, &action)

			if err != nil {
				return err
			}

			dict[action.Name] = action.ContractAddress

			x, _ = json.Marshal(action)
			err = json.Unmarshal(x, &jsonData[key])

			if err != nil {
				return err
			}
		}
	}

	// Truncate the file
	err = file.Truncate(0)
	if err != nil {
		return err
	}

	// Seek to the beginning of the file
	_, err = file.Seek(0, 0)
	if err != nil {
		return err
	}

	encoder := json.NewEncoder(file)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")

	err = encoder.Encode(jsonData)
	if err != nil {
		return err
	}

	return nil
}

func getAddressFromPk(pk string) (string, error) {
	privateKeyHex := pk[2:]
	if privateKeyHex == "" {
		return "", errors.New("private key not set")
	}

	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return "", err
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", errors.New("casting public key to ecdsa error")
	}

	address := crypto.PubkeyToAddress(*publicKeyECDSA).Hex()

	return address, nil
}

func Aes256Decode(cipherText string, encKey string, iv string) (decryptedString string) {
	ivHex, err := hex.DecodeString(iv)
	if err != nil {
		panic(err)
	}

	fmt.Println(len(ivHex))

	bKey := pbkdf2.Key([]byte(encKey), ivHex, 100000, 32, sha256.New)
	cipherTextDecoded, err := hex.DecodeString(cipherText)
	if err != nil {
		panic(err)
	}

	block, err := aes.NewCipher(bKey)
	if err != nil {
		panic(err)
	}

	mode := cipher.NewCBCDecrypter(block, ivHex)
	mode.CryptBlocks([]byte(cipherTextDecoded), []byte(cipherTextDecoded))
	return string(cipherTextDecoded)
}

func main() {
	godotenv.Load()

	paths, err := buildPaths("deployments")

	if err != nil {
		panic(err)
	}

	dict := make(map[string]string)

	deployerAddress, err := getAddressFromPk(os.Getenv("DEPLOYER_KEY"))
	if err != nil {
		panic(err)
	}
	dict["DEPLOYER"] = deployerAddress

	operatorAddress, err := getAddressFromPk(os.Getenv("OPERATOR_KEY"))
	if err != nil {
		panic(err)
	}
	dict["OPERATOR"] = operatorAddress

	decryptKey := os.Args[1]
	iv := os.Getenv("IV")
	ownerKeyEncrypted := os.Getenv("OWNER_KEY")
	ownerKey := Aes256Decode(ownerKeyEncrypted, decryptKey, iv)[0:66]

	ownerAddress, err := getAddressFromPk(ownerKey)
	if err != nil {
		panic(err)
	}
	dict["OWNER"] = ownerAddress

	for _, path := range paths {
		err := processSingle(dict, path)
		if err != nil {
			fmt.Printf("Error processing file %s: %s\n", path, err)
		}
	}

	// var action = DeploymentAction{
	// 	Type:                 "deployment",
	// 	Name:                 "Root",
	// 	Artifact:             "root/Root.sol",
	// 	ConstructorArguments: []interface{}{"0x000090D38BCc60A8CEA2E0cDC9f9182750D5d2b3"},
	// 	Leading:              "8888",
	// 	Salt:                 "0x0000000000000000000000000000000000000000000000000000000000000000",
	// 	ContractAddress:      "",
	// }

	// generateAddressPipeline(map[string]string{}, &action)
	// fmt.Println(action)
}
