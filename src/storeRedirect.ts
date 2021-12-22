import { APIGatewayProxyResult } from "aws-lambda";
import { dbDocClient, TABLE_NAME, RedirectTableItem } from "./db";
import * as uuid from "uuid";
import { publicIdToAddress } from "./utils";
import { isPublicIdAvailable } from "./customizeRedirect";
import { getEntryForFoundryId } from "./queries";

export async function storeFoundryRedirect(foundryId:string, externalAddress:string, localAddress:string) : Promise<APIGatewayProxyResult> {
    console.log("Checking for existing entry with Id " + foundryId);
    // check the DB to determine if foundryId exists in it already
    return getEntryForFoundryId(foundryId).then(async existingEntry => {
        if(existingEntry) {
            // An entry exists with the given foundry_id. Update that entry and return it's public_id
            console.log("An entry exists for this foundry instance. Updating...");
            let publicId =existingEntry.public_id;
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
            
            // sanity check that the uuid doesn't exist already
            let sanityCount = 0;
            while(!isPublicIdAvailable(newPublicId)){
                newPublicId = uuid.v1();
                sanityCount += 1;
                // out of paranoia, only try this 100 times to prevent
                // an infinite loop if uuid always returns the same thing
                if(sanityCount > 100){
                    return {
                        statusCode: 500,
                        body: JSON.stringify("Error generating unique redirect address")
                    };
                }
            }

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

export async function getRedirectUrlForFoundry(foundryId:string) : Promise<APIGatewayProxyResult> {

    try{
        const entry = await getEntryForFoundryId(foundryId);
        if(entry){
            return {
                statusCode: 200,
                body: publicIdToAddress(entry.public_id)
            }
        } else {
            return {
                statusCode: 404,
                body: `No foundry redirect found for ${foundryId}`
            };
        }
    } catch(err){
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify(err)
        };
    }
}
