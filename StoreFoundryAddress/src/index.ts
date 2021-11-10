import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";
import * as uuid from "uuid";

AWS.config.update({
  region: "us-west-2",
});

const TABLE_NAME = "FoundryRedirects";
interface RedirectTableItem {
    public_id: string,
    foundry_id : string,
    local_address : string,
    external_address : string,
}
namespace TableKeys {
    export const FoundryIdKey = 'foundry_id';
}

const docClient = new AWS.DynamoDB.DocumentClient();

namespace ApiQueryStrings {
    export const FoundryId = 'foundry_id';
    export const ExternalIp = 'external_address';
    export const InternalIp = 'internal_address';
}

export const handler = async (event:APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let foundryId = event.queryStringParameters ? event.queryStringParameters[ApiQueryStrings.FoundryId] : "";
    let externalIp = event.queryStringParameters ? event.queryStringParameters[ApiQueryStrings.ExternalIp] : "";
    let localIp = event.queryStringParameters ? event.queryStringParameters[ApiQueryStrings.InternalIp] : "";
    
    if(!foundryId){
        return {
            statusCode: 400,
            body : JSON.stringify(`Required parameter ${ApiQueryStrings.FoundryId} missing`)
        };
    }
    
    if(!externalIp){
        return {
            statusCode: 400,
            body : JSON.stringify(`Required parameter ${ApiQueryStrings.ExternalIp} missing`)
        };
    }
    
    if(!localIp){
        return {
            statusCode: 400,
            body : JSON.stringify(`Required parameter ${ApiQueryStrings.InternalIp} missing`)
        };
    }
    
    
    console.log("Checking for existing entry with Id " + foundryId);
    // check the DB to determine if foundryId exists in it already
    const queryPromise = docClient.query({
        TableName: TABLE_NAME,
        ExpressionAttributeNames: {
            "#f": `${TableKeys.FoundryIdKey}`
        },
        ExpressionAttributeValues: {
            ':f' : foundryId
        },
        KeyConditionExpression: '#f = :f',
    }).promise();
    
    return queryPromise.then(async queryData => {
        console.log(queryData);
        if(queryData.Count > 0) {
            // An entry exists with the given foundry_id. Update that entry and return it's public_id
            console.log("An entry exists for this foundry instance. Updating...");
            let publicId = queryData.Items[0].public_id;
            const tableItem : RedirectTableItem  = {
                public_id : publicId,
                foundry_id : foundryId,
                external_address : externalIp,
                local_address : localIp,
            }
            let updateParams = {
                TableName: TABLE_NAME,
                Item: tableItem
            };
            await docClient.put(updateParams).promise();
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: `Successful update ${foundryId} ${externalIp} ${localIp} ${publicId}`,
                    public_id: publicId
                })
            }; 
        } else {
            // New foundry_id. Create an entry with a newly generated public_id
            console.log("New foundry instance. Updating...");
            let newPublicId = uuid.v1();
            
            // TODO sanity check that the uuid doesnt exist already

            const tableItem : RedirectTableItem  = {
                public_id : newPublicId,
                foundry_id : foundryId,
                external_address : externalIp,
                local_address : localIp,
            }
            let updateParams = {
                TableName: TABLE_NAME,
                Item: tableItem
            };
            await docClient.put(updateParams).promise();
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: `Successful update ${foundryId} ${externalIp} ${localIp} ${newPublicId}`,
                    public_id: newPublicId
                })
            }; 
        }
    }).catch(err => {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify(err)
        };
    });
};
