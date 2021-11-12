import { APIGatewayProxyResult } from "aws-lambda";
import { dbDocClient, TABLE_NAME, TableKeys, RedirectTableItem } from "./db";
import * as uuid from "uuid";

export async function storeFoundryRedirect(foundryId:string, externalAddress:string, localAddress:string) : Promise<APIGatewayProxyResult> {
    console.log("Checking for existing entry with Id " + foundryId);
    // check the DB to determine if foundryId exists in it already
    const queryPromise = dbDocClient.query({
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
                external_address : externalAddress,
                local_address : localAddress,
            }
            let updateParams = {
                TableName: TABLE_NAME,
                Item: tableItem
            };
            await dbDocClient.put(updateParams).promise();
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: `Successful update ${foundryId} ${externalAddress} ${localAddress} ${publicId}`,
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
                external_address : externalAddress,
                local_address : localAddress,
            }
            let updateParams = {
                TableName: TABLE_NAME,
                Item: tableItem
            };
            await dbDocClient.put(updateParams).promise();
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: `Successful update ${foundryId} ${externalAddress} ${localAddress} ${newPublicId}`,
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
}

export  async function getRedirectUrlForFoundry(foundryId:string) : Promise<APIGatewayProxyResult> {
    return {
        statusCode : 500,
        body: "not implemented"
    }
}