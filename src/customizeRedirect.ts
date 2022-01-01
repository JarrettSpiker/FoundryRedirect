import { APIGatewayProxyResult } from "aws-lambda";
import { dbDocClient, TABLE_NAME } from "./db";
import { getEntryForFoundryId, scanForRowWithPublicId } from "./queries";

export async function checkCustomPublicId(publicId:string) : Promise<APIGatewayProxyResult> {
    
    // check for illegal characters
    let isAlphaNumeric = publicId.match(/^[0-9a-zA-Z_\-]+$/)
    if(!isAlphaNumeric){
        return  {
            statusCode: 400,
            body: JSON.stringify("Custom addresses must contain only letters, numbers, hyphens, and underscores"),
        }
    }

    // reserve the prefix "api"
    if(publicId.startsWith("api")){
        return {
            statusCode: 400,
            body: JSON.stringify('Custom addresses may not begin with "api"'),
        }
    }
    
    let isAvailable = await isPublicIdAvailable(publicId);
    if(isAvailable){
        return {
            statusCode : 200,
            body: JSON.stringify(`Custom address ${publicId} is available`)
        }
    } else {
        return {
            statusCode : 406,
            body: JSON.stringify(`Custom address ${publicId} is not available`)
        }
    }
}

export async function customizePublicId(foundryId:string, publicId:string) : Promise<APIGatewayProxyResult> {
   
    let available = await checkCustomPublicId(publicId);
    if(available.statusCode !== 200) {
        return available;
    }
    try {
        let tableEntry = await getEntryForFoundryId(foundryId);
        tableEntry.public_id = publicId;
        let updateParams = {
            TableName: TABLE_NAME,
            Item: tableEntry
        };
        await dbDocClient.put(updateParams).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successful update ${foundryId} ${tableEntry.external_address} ${tableEntry.local_address} ${publicId}`,
                public_id: publicId
            })
        };
    } catch (err){
        return {
            statusCode: 500,
            body: JSON.stringify(err),
        }
    }
}
 
export async function isPublicIdAvailable(publicId:string) : Promise<boolean> {
    const query = scanForRowWithPublicId(publicId);
    return query.then(rows =>{
        return rows.Count === 0;
    }).catch(error => {
        console.log(error);
        return false;
    });
    
}