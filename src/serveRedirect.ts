import { APIGatewayProxyResult } from "aws-lambda";
import { dbDocClient, TABLE_NAME, TableKeys, RedirectTableItem } from "./db";

export async function serveFoundryRedirect(id:string, isLocal:boolean) : Promise<APIGatewayProxyResult> {
    try {
        // check the database for an entry with publicId = id
        const fetchQuery = dbDocClient.scan({
            TableName: TABLE_NAME,
            ExpressionAttributeNames: {
                "#f": `${TableKeys.PublicIdKey}`
            },
            ExpressionAttributeValues: {
                ':f' : id
            },
            FilterExpression: '#f = :f',
        });

        const queryRes = await fetchQuery.promise();
        if(queryRes.Count === 0){
            return {
                statusCode: 404,
                body: `No foundry server is registered with ID ${id}`
            }
        } else if(queryRes.Count > 1) {
            return {
                statusCode: 500,
                body: `Multiple servers registered with ID ${id}`
            }
        } 
        const foundryServerRedirects = <RedirectTableItem>queryRes.Items[0];
        let redirectAddress = foundryServerRedirects.external_address;
        if(isLocal){
            redirectAddress = foundryServerRedirects.local_address;
        }

        if(!redirectAddress.startsWith("http")){
            redirectAddress = "http://" + redirectAddress;
        }

        const response = {
            statusCode: 301,
            headers: {
                Location: redirectAddress
            },
            body : ""
        };
        return response;


    } catch(err){
        return {
            statusCode: 500,
            body: JSON.stringify(err)
        }
    }
}