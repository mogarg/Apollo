# Apollo

Apollo named after the Greek god of music is a chaincode (Smart Contract) for ticket management for Musical Events.

## Why a Permissioned Blockchain

Ticket management includes several organizations from music labels to organizers to ticketing services. The Byzantine Consensus of Hyperledger and the nature of immutability strives to curb mistrust amongst the participating organizations.

## Major Features

1. Create tickets by id, price, day of the event (to support multi-day events) and seat number.

2. To support discounts repricing of tickets is supported as well transfer of tickets.

3. Locking of tickets is also supported to prevent any modifications within certain days of the event.

4. Tickets can also be deleted. However, it is possible to view the entire history of the ticket by it's id.

## Architecture

An admin (or a service that acts as an admin) can generate tickets and delete tickets using a certificate it receives while enrolling while all services including banking services, ticketing services access the Blockchain using their user ids which also include their own certificated.

## How to Run

1. Start the Fabric network and deploy apollo chaincode by running.

```bash
cd scripts
./startFabric.sh
```

2. Install all the node.js dependencies.

```bash
npm install
```

3. Enroll the admin and the user. <sup>[1]</sup>

```bash
node enrollAdmin.js
node registerUser.js
```

4. Start the server.

```bash
node server.js
```

[1]: For now the generated certificates are stored in the directory hfc-key-store. However, these are intended to be distributed to services using secure channels. Also, for now the users are enrolled in the admin role to aid testing and development. However granting access to chaincode functions using roles based on services is left for future work.

Endpoint          |Params             |Returns         |Method|
| --- | --- | --- | --- |
|/api/ticket/create|id, price (numeric string), day (numeric string), seat        |TransactionId |POST|
|/api/reprice|id|TransactionId|PUT|
|/api/transfer|id|TransactionId|PUT|
|/api/ticketbyowner|id|String result|GET|
|/api/ticketHistory|id|String result|GET|
|/api/alltickets||String result|GET|
|/api/delete|id|String result|POST|
|/api/lock|id|TransactionId|PUT|

## Notes

1. Initially the tickets are created with no owner. Hence, transferring the ticket for first time is equivalent to selling a ticket.
2. The owners and their wallets are not managed using this chaincode. Their authentication and payment management is left to banking/authentication services or to another chaincode. Since, hyperledger does not have a native currency implementing a chaincode which does that is another project on it's own.
3. Tickets and seat numbers are not checked for valid values. Hence, currently they would have to be done at a service level.

## External Code Usage

The application is based off Hyperledger Fabric samples provided at [Fabric Samples](https://github.com/hyperledger/fabric-samples.git). The corresponding licenses and copyrights have been left in the file as is.