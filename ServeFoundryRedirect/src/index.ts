import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

AWS.config.update({
    region: "us-west-2",
});
  

// TODO this should really be shared somehow
const TABLE_NAME = "FoundryRedirects";
interface RedirectTableItem {
    public_id: string,
    foundry_id : string,
    local_address : string,
    external_address : string,
}
namespace TableKeys {
    export const FoundryIdKey = 'foundry_id';
    export const PublicIdKey = 'public_id';

}

const docClient = new AWS.DynamoDB.DocumentClient();

const URL_ID_KEY = "publicId"
const URL_RESOURCE_LOCAL = "/local"

export const handler = async (event:APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    
    let id = event.pathParameters? event.pathParameters[URL_ID_KEY] : "";
    if(!id){
        return {
            statusCode: 400,
            body : JSON.stringify(`Required id parameter missing from URL`)
        };
    }

    try {
        // check the database for an entry with publicId = id
        const fetchQuery = docClient.scan({
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
        if(event.resource.endsWith(URL_RESOURCE_LOCAL)){
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
};
