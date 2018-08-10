/**
	Apollo Ticketing System

	Enter the container
    docker exec -it cli bash

	Operations supported
	1. Create Ticket by <id>, <price>, <day>, <seat>
	peer chaincode invoke -C mychannel -n apollo -c '{"Args":["generateTicket", "a", "100", "1", "a64"]}'

*/

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/protos/peer"
)

// Apollo specifies chaincode for a musical event ticketing system
// Notice: 1. Query the tickets with id before inserting tickets since
// a peer could generate a ticket with the same id (distributed id generation
// is not supported), query for added owners (writes can be delayed)
// otherwise generate operation can fail.
// locking is irreversible
type Apollo struct{}

// Ticket for the event which specifies the ticket id, price, owner
// day (to support multi-day events) and
// Every ticket has a unique id. An owner can hold multiple
// tickets and the owners for a ticket are mutable.
type Ticket struct {
	ObjType string `json:"docType"` //to uniquely identify ticket when storing
	ID      string `json:"id"`
	Price   uint64 `json:"price"`
	Owner   string `json:"owner"`
	Day     int    `json:"day"`
	Seat    string `json:"seat"`
	Locked  *bool  `json:"locked"`
}

// Init with invariants for the tickets. In case multiple users from the
// same organization use the contract, invalid operations can be prevented
func (t *Apollo) Init(stub shim.ChaincodeStubInterface) peer.Response {
	return shim.Success(nil)
}

// Invoke is called per transaction on the chaincode. Each transaction is
// either a 'get' or a 'set' on the asset created by Init function. The Set
// method may create a new asset by specifying a new key-value pair.
func (t *Apollo) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	// Extract the function and args from the transaction proposal
	fn, args := stub.GetFunctionAndParameters()

	if fn == "generateTicket" { //generate a new ticket
		return t.generateTicket(stub, args)
	} else if fn == "transferTicket" { //transfer the ticket by owner
		return t.transferTicket(stub, args)
	} else if fn == "queryTicket" { //read a ticket
		return t.queryTicket(stub, args)
	} else if fn == "queryTicketByOwner" { //read a ticket by owner
		return t.queryTicketByOwner(stub, args)
	} else if fn == "repriceTicket" { //change the value of a ticket
		return t.repriceTicket(stub, args)
	} else if fn == "deleteTicket" { // delete a ticket
		return t.deleteTicket(stub, args)
	} else if fn == "ticketHistory" { //get the history of the values of the ticket
		return t.ticketHistory(stub, args)
	} else if fn == "queryAllTickets" { //get information about all tickets
		return t.queryAllTickets(stub)
	} else if fn == "lockTicket" { //lock ticket to prevent any further updates
		return t.lockTicket(stub, args)
	}

	fmt.Println("Invoke did not find this func:" + fn)
	return shim.Error("Function invocation not found")
}

// Generate ticket creates a new ticket with id, price, day and seat information
func (t *Apollo) generateTicket(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	var err error
	// id price day seat
	if len(args) != 4 {
		fmt.Println("Apollo: generateTicket <id> <price> <day> <seat>")
		return shim.Error("Incorrent number of arguments. Expecting 4")
	}

	fmt.Println("Apollo: Generating ticket initiated --")
	if len(args[0]) <= 0 {
		return shim.Error("1st argument must be a non-empty string")
	}
	if len(args[1]) <= 0 {
		return shim.Error("2nd argument must be a non-empty string")
	}
	if len(args[2]) <= 0 {
		return shim.Error("3rd argument must be a non-empty string")
	}
	if len(args[3]) <= 0 {
		return shim.Error("4th argument must be a non-empty string")
	}

	id := args[0]
	seat := args[3]
	price, err := strconv.ParseUint(args[1], 10, 64)
	if err != nil {
		return shim.Error("2nd argument must be a numeric string")
	}
	day, err := strconv.Atoi(args[2])
	if err != nil {
		return shim.Error("3rd argument must be a numeric string")
	}

	tvalbytes, err := stub.GetState(id)
	if err != nil {
		return shim.Error("Failed to get state for ticket" + err.Error())
	} else if tvalbytes != nil {
		fmt.Println("This ticket already exists" + id)
		return shim.Error("This ticket already exists" + id)
	}

	objectType := "ticket"
	f := new(bool)
	*f = false
	ticket := &Ticket{objectType, id, price, "", day, seat, f}

	tvalbytes, err = json.Marshal(ticket)
	if err != nil {
		shim.Error(err.Error())
	}

	err = stub.PutState(id, tvalbytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("-- Success: Generating ticket complete")
	return shim.Success(nil)
}

func (t *Apollo) transferTicket(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	//  "id" "owner"
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	id := args[0]
	newOwner := strings.ToLower(args[1])
	fmt.Println("Apollo: Transfer ticket initiated --")
	tvalbytes, err := stub.GetState(id)
	if err != nil {
		return shim.Error("Failed to get state for ticket: " + id + " " + err.Error())
	}
	if tvalbytes == nil {
		return shim.Error("Ticket not found: " + id)
	}

	ticket := Ticket{}
	err = json.Unmarshal(tvalbytes, &ticket)

	if err != nil {
		return shim.Error(err.Error())
	}

	if *ticket.Locked == true {
		return shim.Error("Can not transfer ownership for a locked ticket")
	}

	ticket.Owner = newOwner

	tvalbytes, err = json.Marshal(ticket)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = stub.PutState(id, tvalbytes)

	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("-- Success: Transfer ticket complete")
	return shim.Success(nil)
}

func (t *Apollo) queryTicket(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	var response string
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting the id of the ticket to query.")
	}

	id := args[0]
	tvalbytes, err := stub.GetState(id)
	if err != nil {
		response = "{\"Error\":\"Failed to get information about ticket id" + id + "\"}"
		return shim.Error(response)
	} else if tvalbytes == nil {
		response = "{\"Error\":\"Ticket with id" + id + " does not exist\"}"
		return shim.Error(response)
	}

	return shim.Success(tvalbytes)
}

func (t *Apollo) queryTicketByOwner(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	// owner
	if len(args) < 1 {
		fmt.Println("queryTicketByOwner <owner>")
		shim.Error("Incorrect number of arguments. Expecting 1.")
	}

	owner := args[0]

	query := fmt.Sprintf("{\"selector\":{\"docType\":\"ticket\", \"owner\": \"%s\"}}", owner)

	result, err := resultFromQuery(stub, query)

	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(result)
}

// reprice is used to change price of tickets to support discounts, early-bird and other offers
func (t *Apollo) repriceTicket(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	var response string
	//  "id" "new price"
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting the id, new price.")
	}

	id := args[0]
	newPrice, err := strconv.ParseUint(args[1], 10, 64)
	fmt.Println("Apollo: repricing ticket initiated -")
	if err != nil {
		response = ""
	}

	tvalbytes, err := stub.GetState(id)
	if err != nil {
		response = "{\"Error\":\"Failed to get information about ticket id" + id + "\"}"
		return shim.Error(response)
	} else if tvalbytes == nil {
		response = "{\"Error\":\"Ticket with id" + id + "does not exist\"}"
		return shim.Error(response)
	}

	ticket := Ticket{}
	err = json.Unmarshal(tvalbytes, &ticket)

	if err != nil {
		return shim.Error(err.Error())
	}

	if ticket.Owner != "" {
		response = "{\"Invalid\":\"Can not reprice sold tickets\"}"
		return shim.Error(response)
	}

	if *ticket.Locked == true {
		response = "{\"Invalid\":\"Can not reprice locked tickets\"}"
		return shim.Error(response)
	}

	ticket.Price = newPrice

	tvalbytes, err = json.Marshal(ticket)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = stub.PutState(id, tvalbytes)

	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("-- Success: Repricing Ticket complete")
	return shim.Success(nil)
}

func (t *Apollo) queryAllTickets(stub shim.ChaincodeStubInterface) peer.Response {
	startKey := ""
	endKey := ""

	var buffer bytes.Buffer

	queryResultsIterator, err := stub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}

	buffer.WriteString("[")

	written := false
	for queryResultsIterator.HasNext() {
		queryResult, err := queryResultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}

		if written == true {
			buffer.WriteString(",")
		}

		buffer.WriteString("{\"id\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResult.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"ticket\":")
		buffer.WriteString(string(queryResult.Value))
		buffer.WriteString("}")
		written = true
	}

	buffer.WriteString("]")

	fmt.Printf("-- Success: result:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}

func resultFromQuery(stub shim.ChaincodeStubInterface, query string) ([]byte, error) {
	var buffer bytes.Buffer
	fmt.Printf("Apollo: resultFromQuery:\n%s-\n", query)

	queryResultsIterator, err := stub.GetQueryResult(query)
	if err != nil {
		return nil, err
	}
	defer queryResultsIterator.Close()

	buffer.WriteString("[")

	written := false
	for queryResultsIterator.HasNext() {
		queryResult, err := queryResultsIterator.Next()
		if err != nil {
			return nil, err
		}

		if written == true {
			buffer.WriteString(",")
		}

		buffer.WriteString("{\"id\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResult.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"ticket\":")
		buffer.WriteString(string(queryResult.Value))
		buffer.WriteString("}")
		written = true
	}

	buffer.WriteString("]")

	fmt.Printf("-- Success: result:\n%s\n", buffer.String())
	return buffer.Bytes(), nil
}

func (t *Apollo) ticketHistory(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) < 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	id := args[0]

	fmt.Printf("Apollo: ticketHistory: %s\n", id)

	resultsIterator, err := stub.GetHistoryForKey(id)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	var buffer bytes.Buffer
	buffer.WriteString("[")

	written := false
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		if written == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"TxId\":")
		buffer.WriteString("\"")
		buffer.WriteString(response.TxId)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Value\":")
		if response.IsDelete {
			buffer.WriteString("null")
		} else {
			buffer.WriteString(string(response.Value))
		}

		buffer.WriteString(", \"Timestamp\":")
		buffer.WriteString("\"")
		buffer.WriteString(time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).String())
		buffer.WriteString("\"")

		buffer.WriteString(", \"IsDelete\":")
		buffer.WriteString("\"")
		buffer.WriteString(strconv.FormatBool(response.IsDelete))
		buffer.WriteString("\"")

		buffer.WriteString("}")
		written = true
	}
	buffer.WriteString("]")

	fmt.Printf("-- Success result:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}

func (t *Apollo) lockTicket(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	var response string
	if len(args) < 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1.")
	}

	id := args[0]

	tvalbytes, err := stub.GetState(id)
	if err != nil {
		response = "{\"Error\":\"Failed to get information about ticket id" + id + "\"}"
		return shim.Error(response)
	} else if tvalbytes == nil {
		response = "{\"Error\":\"Ticket with id" + id + "does not exist\"}"
		return shim.Error(response)
	}

	ticket := Ticket{}
	err = json.Unmarshal(tvalbytes, &ticket)

	if ticket.Owner == "" {
		response = "{\"Error\":\"Can not lock an unsold ticket\"}"
		return shim.Error(response)
	}

	f := new(bool)
	*f = true

	ticket.Locked = f
	tvalbytes, err = json.Marshal(ticket)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = stub.PutState(id, tvalbytes)

	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("-- Success: Repricing Ticket complete")
	return shim.Success(nil)
}

func (t *Apollo) deleteTicket(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	var response string
	// id
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting the id.")
	}

	id := args[0]

	tvalbytes, err := stub.GetState(id)
	if err != nil {
		response = "{\"Error\":\"Failed to get information about ticket id" + id + "\"}"
		return shim.Error(response)
	} else if tvalbytes == nil {
		response = "{\"Error\":\"Ticket with id" + id + "does not exist\"}"
		return shim.Error(response)
	}

	err = stub.DelState(id)
	if err != nil {
		return shim.Error("{\"Error\":\"Failed to delete ticket" + id + "\"}")
	}

	return shim.Success(nil)
}

// main function starts up the chaincode in the container during instantiate
func main() {
	if err := shim.Start(new(Apollo)); err != nil {
		fmt.Printf("Error starting Apollo chaincode: %s", err)
	}
}
