var hfc = require('fabric-client');
var path = require('path');
var util = require('util');

const boxoffice = {
    generateTicket,
    repriceTicket,
    transferTicket,
    ticketFromOwner,
    ticketHistory,
    queryAllTickets,
    deleteTicket,
    lockTicket
};

module.exports = boxoffice;

// Probably move this into a config file
const options = {
    wallet: path.join(__dirname, 'hfc-key-store'),
    userId: 'admin',
    channelId: 'mychannel',
    chaincode: 'apollo',
    peer: 'grpc://localhost:7051',
    events: 'grpc://localhost:7053',
    orderer: 'grpc://localhost:7050'
};

function generateTicket(req, res, next) {
    const {id, price, day, seat } = req.body;
   
    console.log(util.format('Generate Ticket {id:%s, price:%s, day:%d, seat:%s',id, price, day, seat));

    const client = new hfc();
    const ca = null;
   
    var transactionId = null;
    let channel = null;
    
    return _initialize(client)
            .then(ch=>{
                channel = ch;
                console.log(channel);
                transactionId = client.newTransactionID();

                var request = {
                    chaincodeId: options.chaincode,
                    fcn: 'generateTicket',
                    args: [id, price, day, seat],
                    txId: transactionId 
                };
                return channel.sendTransactionProposal(request);
            })
            .then(response =>{
                const proposalResponses = response[0];
                const proposal = response[1];
                const header = response[2];
                let isProposalSuccessful = false;

                if(proposalResponses && proposalResponses[0].response && 
                proposalResponses[0].response.status === 200){
                    isProposalSuccessful = true;
                }else{
                    throw new Error('Proposal : Failed');
                }
                
                if(isProposalSuccessful){
                    var result = proposalResponses[0];
                    console.log(util.format('Proposal : Success, Response: Status - %s, message - %s, metadata - %s, endorsement - %s', result.response.status,
                result.response.message, result.response.payload, result.endorsement.signature));
                    const request = {
                        proposalResponses: proposalResponses,
                        proposal: proposal,
                        header : header
                    };

                var txId = transactionId.getTransactionID();
                var eventPromises = [];
                var hub = client.newEventHub();
                hub.setPeerAddr(options.events);
                hub.connect();

                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(() => {
                        hub.disconnect();
                        reject();
                    }, 30000);

                    hub.registerTxEvent(txId, (tx, code) => {
                        clearTimeout(handle);
                        hub.unregisterTxEvent(transactionId);
                        hub.disconnect(true);

                        if (code !== 'VALID') {
                            console.error(
                                'The transaction was invalid, code = ' + code);
                            reject();
                        } else {
                            console.log(
                                'The transaction has been committed on peer ' +
                                hub._ep._endpoint.addr);
                            resolve();
                        }
                    });
                });

                eventPromises.push(txPromise);
                const sendPromise = channel.sendTransaction(request);
                return Promise.all([sendPromise].concat(eventPromises))
                    .then((results) => {
                        console.log(' event promise all complete and testing complete');
                        return results[0]; // the first returned value is from the 'sendPromise' which is from the
                                           // 'sendTransaction()' call
                    })
                    .catch(err => {
                        console.error(
                            'Failed to send transaction and get notifications within the timeout period.'
                        );
                        return 'Failed to send transaction and get notifications within the timeout period.';
                    });

                }
            })
            .then(response => {
                if (response.status === 'SUCCESS') {
                    console.log('Successfully sent transaction to the orderer.');
                    return res.send(transactionId.getTransactionID());
                } else {
                    console.error('Failed to order the transaction. Error code: ' + response.status);
                    return res.status(400).send('Failed to order the transaction. Error code: ' + response.status);
                }
            })
            .catch(err => {
                res.status(400).send(util.format('Caught Error', err));
            });
    
}

function lockTicket(req, res, next) {
    const {id} = req.body;
   
    console.log(util.format('Lock Ticket {id:%s, }', id));

    const client = new hfc();
   
    var transactionId = null;
    let channel = null;
    
    return _initialize(client)
            .then(ch=>{
                channel = ch;
                console.log(channel);
                transactionId = client.newTransactionID();

                var request = {
                    chaincodeId: options.chaincode,
                    fcn: 'lockTicket',
                    args: [id],
                    txId: transactionId 
                };
                return channel.sendTransactionProposal(request);
            })
            .then(response =>{
                const proposalResponses = response[0];
                const proposal = response[1];
                const header = response[2];
                let isProposalSuccessful = false;

                if(proposalResponses && proposalResponses[0].response && 
                proposalResponses[0].response.status === 200){
                    isProposalSuccessful = true;
                }else{
                    throw new Error('Proposal : Failed');
                }
                
                if(isProposalSuccessful){
                    var result = proposalResponses[0];
                    console.log(util.format('Proposal : Success, Response: Status - %s, message - %s, metadata - %s, endorsement - %s', result.response.status,
                result.response.message, result.response.payload, result.endorsement.signature));
                    const request = {
                        proposalResponses: proposalResponses,
                        proposal: proposal,
                        header : header
                    };

                var txId = transactionId.getTransactionID();
                var eventPromises = [];
                var hub = client.newEventHub();
                hub.setPeerAddr(options.events);
                hub.connect();

                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(() => {
                        hub.disconnect();
                        reject();
                    }, 30000);

                    hub.registerTxEvent(txId, (tx, code) => {
                        clearTimeout(handle);
                        hub.unregisterTxEvent(transactionId);
                        hub.disconnect(true);

                        if (code !== 'VALID') {
                            console.error(
                                'The transaction was invalid, code = ' + code);
                            reject();
                        } else {
                            console.log(
                                'The transaction has been committed on peer ' +
                                hub._ep._endpoint.addr);
                            resolve();
                        }
                    });
                });

                eventPromises.push(txPromise);
                const sendPromise = channel.sendTransaction(request);
                return Promise.all([sendPromise].concat(eventPromises))
                    .then(results => {
                        console.log(' event promise all complete and testing complete');
                        return results[0]; // the first returned value is from the 'sendPromise' which is from the
                                           // 'sendTransaction()' call
                    })
                    .catch(err => {
                        console.error(
                            'Failed to send transaction and get notifications within the timeout period.'
                        );
                        return 'Failed to send transaction and get notifications within the timeout period.';
                    });

                }
            })
            .then(response => {
                if (response.status === 'SUCCESS') {
                    console.log('Successfully sent transaction to the orderer.');
                    return res.send(transactionId.getTransactionID());
                } else {
                    console.error('Failed to order the transaction. Error code: ' + response.status);
                    return res.status(400).send('Failed to order the transaction. Error code: ' + response.status);
                }
            })
            .catch(err => {
                res.status(400).send(util.format('Caught Error', err));

            });
    
}

function repriceTicket(req, res, next) {
    const {id, newPrice} = req.body;
   
    console.log(util.format('Reprice Ticket {id:%s, newPrice:%s, day:%d, seat:%s',id, newPrice));

    const client = new hfc();
   
    var transactionId = null;
    let channel = null;
    
    return _initialize(client)
            .then(ch=>{
                channel = ch;
                console.log(channel);
                transactionId = client.newTransactionID();

                var request = {
                    chaincodeId: options.chaincode,
                    fcn: 'repriceTicket',
                    args: [id, newPrice],
                    txId: transactionId 
                };
                return channel.sendTransactionProposal(request);
            })
            .then(response =>{
                const proposalResponses = response[0];
                const proposal = response[1];
                const header = response[2];
                let isProposalSuccessful = false;

                if(proposalResponses && proposalResponses[0].response && 
                proposalResponses[0].response.status === 200){
                    isProposalSuccessful = true;
                }else{
                    throw new Error('Proposal : Failed');
                }
                
                if(isProposalSuccessful){
                    var result = proposalResponses[0];
                    console.log(util.format('Proposal : Success, Response: Status - %s, message - %s, metadata - %s, endorsement - %s', result.response.status,
                result.response.message, result.response.payload, result.endorsement.signature));
                    const request = {
                        proposalResponses: proposalResponses,
                        proposal: proposal,
                        header : header
                    };

                var txId = transactionId.getTransactionID();
                var eventPromises = [];
                var hub = client.newEventHub();
                hub.setPeerAddr(options.events);
                hub.connect();

                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(() => {
                        hub.disconnect();
                        reject();
                    }, 30000);

                    hub.registerTxEvent(txId, (tx, code) => {
                        clearTimeout(handle);
                        hub.unregisterTxEvent(transactionId);
                        hub.disconnect(true);

                        if (code !== 'VALID') {
                            console.error(
                                'The transaction was invalid, code = ' + code);
                            reject();
                        } else {
                            console.log(
                                'The transaction has been committed on peer ' +
                                hub._ep._endpoint.addr);
                            resolve();
                        }
                    });
                });

                eventPromises.push(txPromise);
                const sendPromise = channel.sendTransaction(request);
                return Promise.all([sendPromise].concat(eventPromises))
                    .then((results) => {
                        console.log(' event promise all complete and testing complete');
                        return results[0]; // the first returned value is from the 'sendPromise' which is from the
                                           // 'sendTransaction()' call
                    })
                    .catch(err => {
                        console.error(
                            'Failed to send transaction and get notifications within the timeout period.'
                        );
                        return 'Failed to send transaction and get notifications within the timeout period.';
                    });

                }
            })
            .then(response => {
                if (response.status === 'SUCCESS') {
                    console.log('Successfully sent transaction to the orderer.');
                    return res.send(transactionId.getTransactionID());
                } else {
                    console.error('Failed to order the transaction. Error code: ' + response.status);
                    return res.status(400).send('Failed to order the transaction. Error code: ' + response.status);
                }
            })
            .catch(err => {
                res.status(400).send(util.format('Caught error: %s', err));
            });
    
}

function transferTicket(req, res, next) {
    const {id, newOwner} = req.body;
   
    console.log(util.format('Transfer Ticket {id:%s, newPrice:%s, day:%d, seat:%s',id, newOwner));

    const client = new hfc();
   
    var transactionId = null;
    let channel = null;
    
    return _initialize(client)
            .then(ch=>{
                channel = ch;
                console.log(channel);
                transactionId = client.newTransactionID();

                var request = {
                    chaincodeId: options.chaincode,
                    fcn: 'transferTicket',
                    args: [id, newOwner],
                    txId: transactionId 
                };
                return channel.sendTransactionProposal(request);
            })
            .then(response =>{
                const proposalResponses = response[0];
                const proposal = response[1];
                const header = response[2];
                let isProposalSuccessful = false;

                if(proposalResponses && proposalResponses[0].response && 
                proposalResponses[0].response.status === 200){
                    isProposalSuccessful = true;
                }else{
                    throw new Error('Proposal : Failed');
                }
                
                if(isProposalSuccessful){
                    var result = proposalResponses[0];
                    console.log(util.format('Proposal : Success, Response: Status - %s, message - %s, metadata - %s, endorsement - %s', result.response.status,
                result.response.message, result.response.payload, result.endorsement.signature));
                    const request = {
                        proposalResponses: proposalResponses,
                        proposal: proposal,
                        header : header
                    };

                var txId = transactionId.getTransactionID();
                var eventPromises = [];
                var hub = client.newEventHub();
                hub.setPeerAddr(options.events);
                hub.connect();

                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(() => {
                        hub.disconnect();
                        reject();
                    }, 30000);

                    hub.registerTxEvent(txId, (tx, code) => {
                        clearTimeout(handle);
                        hub.unregisterTxEvent(transactionId);
                        hub.disconnect(true);

                        if (code !== 'VALID') {
                            console.error(
                                'The transaction was invalid, code = ' + code);
                            reject();
                        } else {
                            console.log(
                                'The transaction has been committed on peer ' +
                                hub._ep._endpoint.addr);
                            resolve();
                        }
                    });
                });

                eventPromises.push(txPromise);
                const sendPromise = channel.sendTransaction(request);
                return Promise.all([sendPromise].concat(eventPromises))
                    .then((results) => {
                        console.log(' event promise all complete and testing complete');
                        return results[0]; // the first returned value is from the 'sendPromise' which is from the
                                           // 'sendTransaction()' call
                    })
                    .catch(err => {
                        console.error(
                            'Failed to send transaction and get notifications within the timeout period.'
                        );
                        return 'Failed to send transaction and get notifications within the timeout period.';
                    });

                }
            })
            .then(response => {
                if (response.status === 'SUCCESS') {
                    console.log('Successfully sent transaction to the orderer.');
                    return res.send(transactionId.getTransactionID());
                } else {
                    console.error('Failed to order the transaction. Error code: ' + response.status);
                    return res.status(400).send('Failed to order the transaction. Error code: ' + response.status);
                }
            })
            .catch(err => {
                res.status(400).send(util.format('Caught Error: %s', err));
            });
    
}

function ticketFromOwner(req, res, next){
    const {id:owner} = req.params;

    console.log(util.format('Ticket by Owner ', owner));

    const client = new hfc();
    let channel = {};
    return _initialize(client, channel)
    .then(channel=>{
        const request = {
            chaincodeId : options.chaincode,
            txId: client.newTransactionID(),
            fcn: 'queryTicketByOwner',
            args: [owner]
        }

        return channel.queryByChaincode(request);
    })
    .then(response =>{
        res.status(200).send(JSON.parse(response));
    })
    .catch(err =>{
        res.status(400).send(util.format('Caught error: %s', err));
    } )

}

function ticketHistory(req, res, next) {
    const {id: ticketId} = req.params;

    console.log(util.format('Ticket History: %s', ticketId));

    const client = new hfc();
    let channel = {};
    return _initialize(client) 
           .then(channel =>{
                const request = {
                    chaincodeId: options.chaincode,
                    txid : client.newTransactionID,
                    fcn: 'ticketHistory',
                    args: [ticketId]
                }
                return channel.queryByChaincode(request);
           })
           .then(response=>{
               res.status(200).send(JSON.parse(response))
           })
           .catch(err=>{
                res.status(400).send(util.format('Caught error: %s', err));
           })
}

function queryAllTickets(req, res) {
    console.log(util.format('Query all Tickets'));

    const client = new hfc();
    let channel = {};
    return _initialize(client) 
           .then(channel =>{
                const request = {
                    chaincodeId: options.chaincode,
                    txid : client.newTransactionID,
                    fcn: 'queryAllTickets',
                    args: []
                }
                return channel.queryByChaincode(request);
           })
           .then(response=>{
               res.status(200).send(JSON.parse(response));
           })
           .catch(err=>{
                res.status(400).send(util.format('Caught error: %s', err));
           })
}

function deleteTicket(req, res){
    const {id: id} = req.params;

    const client = new hfc();
    let channel = {};
    return _initialize(client)
            .then(channel=>{
                const request = {
                    chaincodeId: options.chaincode,
                    txid: client.newTransactionID(),
                    fcn: 'deleteTicket',
                    arg:[id]
                }
            })
            .then(response=>{
                return res.status(200).send(JSON.parse(util.format('{\n"Success":"Deleted Ticket %s"\n}', id)));
            })
            .catch(err=>{
                res.status(400).send(util.format('Caught error: %s', err));
            })
 }

function _initialize(client) {
    const targets = [];
    let channel = {};

    return hfc.newDefaultKeyValueStore({path: options.wallet})
           .then((wallet)=> {
                client.setStateStore(wallet);

                var crypto_suite = hfc.newCryptoSuite();

                var crypto_store = hfc.newCryptoKeyStore({path: options.wallet});

                crypto_suite.setCryptoKeyStore(crypto_store);
                
                client.setCryptoSuite(crypto_suite);

                var tlsOptions = {
                    trustedRoots: [],
                    verify: false
                }

                return client.getUserContext(options.userId, true);
           })
           .then((user) => {
//               console.log(user);
                if ( user == undefined || !user.isEnrolled()){
                    console.error('User is not enrolled. Please use registerUser.js to register');
                }

                channel = client.newChannel(options.channelId);
                var peer = client.newPeer(options.peer);
                var orderer = client.newOrderer(options.orderer);
                channel.addPeer(peer);
                channel.addOrderer(orderer);
                targets.push(peer);

                return channel;
           });
}