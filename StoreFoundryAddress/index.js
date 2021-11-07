var AWS = require("aws-sdk");
const { v1 : uuidv1 } = require('uuid');

AWS.config.update({
  region: "us-west-2",
});

const TABLE_NAME = "FoundryRedirects";
const FOUNDRY_ID_KEY = 'foundry_id';
const EXTERNAL_IP_KEY = 'external_address';
const INTERNAL_IP_KEY = 'internal_address';

const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    let foundryId = event[FOUNDRY_ID_KEY];
    let externalIp = event[EXTERNAL_IP_KEY];
    let localIp = event[INTERNAL_IP_KEY];
    
    if(!foundryId){
        return {
            statusCode: 400,
            body : JSON.stringify(`Required parameter ${FOUNDRY_ID_KEY} missing`)
        };
    }
    
    if(!externalIp){
        return {
            statusCode: 400,
            body : JSON.stringify(`Required parameter ${EXTERNAL_IP_KEY} missing`)
        };
    }
    
    if(!localIp){
        return {
            statusCode: 400,
            body : JSON.stringify(`Required parameter ${INTERNAL_IP_KEY} missing`)
        };
    }
    
    
    console.log("Checking for existing entry with Id " + foundryId);
    // check the DB to determine if foundryId exists in it already
    const queryPromise = docClient.query({
        TableName: TABLE_NAME,
        ExpressionAttributeNames: {
            "#f": "foundry_id"
        },
        ExpressionAttributeValues: {
            ':f' : foundryId
        },
        KeyConditionExpression: '#f = :f',
    }).promise();
    
    return queryPromise.then(queryData => {
        console.log(queryData);
        if(queryData.Count > 0) {
            // An entry exists with the given foundry_id. Update that entry and return it's public_id
            console.log("An entry exists for this foundry instance. Updating...");
            let publicId = queryData.Items[0].public_id;
            let updateParams = {
                TableName: TABLE_NAME,
                Item: {
                    public_id : publicId,
                    foundry_id : foundryId,
                    external_address : externalIp,
                    local_address : localIp,
                }
            };
            return docClient.put(updateParams).promise().then(()=>{
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: `Successful update ${foundryId} ${externalIp} ${localIp} ${publicId}`,
                        public_id : publicId
                        
                    })
                };
            }); 
        } else {
            // New foundry_id. Create an entry with a newly generated public_id
            console.log("New foundry instance. Updating...");
            let newPublicId = uuidv1();
            let updateParams = {
                TableName: TABLE_NAME,
                Item: {
                    public_id : newPublicId,
                    foundry_id : foundryId,
                    external_address : externalIp,
                    local_address : localIp,
                }
            };
            return docClient.put(updateParams).promise().then(()=>{
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: `Successful update ${foundryId} ${externalIp} ${localIp} ${newPublicId}`,
                        public_id : newPublicId
                        
                    })
                };
            }); 
        }
    }).catch(err => {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify(err)
        };
    });
};
