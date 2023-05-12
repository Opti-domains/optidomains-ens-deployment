package main

import (
	"crypto/ecdsa"
	"crypto/rand"
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

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/math"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/joho/godotenv"
)

var (
	ImmutableCreate2FactoryAddress = common.HexToAddress("0x0000000000ffe8b47b3e2130213b802212439497")
)

type DeploymentAction struct {
	Type                 string        `json:"type"`
	Name                 string        `json:"name"`
	Artifact             string        `json:"artifact"`
	ConstructorArguments []interface{} `json:"constructorArguments"`
	Leading              string        `json:"leading"`
	Salt                 string        `json:"salt"`
	ContractAddress      string        `json:"contractAddress"`
	Deployments          []interface{} `json:"deployments"`
}

func resolveAddress(dict map[string]string, data interface{}) interface{} {
	switch d := data.(type) {
	case string:
		if strings.HasPrefix(d, "<") && strings.HasSuffix(d, ">") {
			key := d[1 : len(d)-1]
			if val, ok := dict[key]; ok {
				return val
			}
			fmt.Printf("Not found %s\n", d)
		}
	case map[string]interface{}:
		for k, v := range d {
			d[k] = resolveAddress(dict, v)
		}
		return d
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
				value := actionInterface.ConstructorArguments[len(constructorArgs)]
				if err != nil {
					return "", err
				}
				constructorArgs = append(constructorArgs, abi.Argument{
					Type: abiType,
				})

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

func calculateAddressBySalt(initCode, salt string) string {
	initCodeHash := crypto.Keccak256Hash(common.FromHex(initCode))

	create2Hash := crypto.Keccak256Hash([]byte{0xff}, ImmutableCreate2FactoryAddress.Bytes(), common.FromHex(salt), initCodeHash.Bytes())

	deploymentAddress := "0x" + create2Hash.Hex()[len(create2Hash.Hex())-40:]

	return deploymentAddress
}

func scanSalt(initCode, leading string) (string, string) {
	address := ""
	salt := ""

	leadingTemplate := leading[:3]

	for !strings.HasPrefix(address, "0x"+leading) {
		saltBytes := make([]byte, 12)
		rand.Read(saltBytes)
		saltHex := hex.EncodeToString(saltBytes)
		salt = "0x0000000000000000000000000000000000000000" + saltHex
		address = calculateAddressBySalt(initCode, salt)
		if strings.HasPrefix(address, "0x"+leadingTemplate) {
			fmt.Println(salt, address)
		}
	}

	return salt, address
}

func generateAddressPipeline(dict map[string]string, action *DeploymentAction) error {
	initCode, err := buildInitCode(dict, action)
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

	var jsonData []*DeploymentAction
	err = json.Unmarshal(content, &jsonData)
	if err != nil {
		return fmt.Errorf("error parsing JSON in file %s: %s", filePath, err)
	}

	for _, action := range jsonData {
		if action.Type == "deployment" {
			err := generateAddressPipeline(dict, action)

			if err != nil {
				return err
			}

			dict[action.Name] = action.ContractAddress
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

func getDeployerAddress() (string, error) {
	privateKeyHex := os.Getenv("DEPLOYER_KEY")[2:]
	if privateKeyHex == "" {
		return "", errors.New("DEPLOYER_KEY not set")
	}

	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return "", err
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", errors.New("Casting public key to ecdsa error")
	}

	address := crypto.PubkeyToAddress(*publicKeyECDSA).Hex()

	return address, nil
}

func main() {
	godotenv.Load()

	paths, err := buildPaths("deployments")

	if err != nil {
		panic(err)
	}

	dict := make(map[string]string)

	deployerAddress, err := getDeployerAddress()

	if err != nil {
		panic(err)
	}

	dict["DEPLOYER"] = deployerAddress

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
