import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { serveFoundryRedirect } from "./serveRedirect";
import { getRedirectUrlForFoundry, storeFoundryRedirect } from "./storeRedirect";

const URL_PUBLIC_ID_KEY = "publicId"
const URL_RESOURCE_LOCAL = "/local"

namespace RootApiQueryStrings {
    export const FoundryId = 'foundry_id';
    export const ExternalIp = 'external_address';
    export const InternalIp = 'internal_address';
}

async function routeEvent(event:APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if(event.resource.startsWith(`/{${URL_PUBLIC_ID_KEY}`)){
        return routePublicId(event);
    } else if(event.resource === "/"){
        return routeRootRequest(event);
    } else {
        return {
            statusCode: 404,
            body : JSON.stringify(`Resource ${event.resource} not found`)
        };
    }
}

async function routeRootRequest(event:APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    // supported requests to / are:
    // - GET (foundryId) -> returns foundry url if available
    // - POST (foundryId) -> adds or updates URLs for foundryId
    let queryParameters : {[key:string]:string}  = event.queryStringParameters ?? {}
    let foundryId = queryParameters[RootApiQueryStrings.FoundryId];
    if(!foundryId){
        return {
            statusCode: 400,
            body : JSON.stringify(`Required parameter ${RootApiQueryStrings.FoundryId} missing`)
        };
    }

    switch(event.httpMethod){
        case "GET":
            return getRedirectUrlForFoundry(foundryId);
        case "POST":
            let externalIp = queryParameters[RootApiQueryStrings.ExternalIp];
            if(!externalIp){
                return {
                    statusCode: 400,
                    body : JSON.stringify(`Required parameter ${RootApiQueryStrings.ExternalIp} missing`)
                };
            }
            let localIp = queryParameters[RootApiQueryStrings.InternalIp];
            if(!localIp){
                return {
                    statusCode: 400,
                    body : JSON.stringify(`Required parameter ${RootApiQueryStrings.InternalIp} missing`)
                };
            }
            return storeFoundryRedirect(foundryId, externalIp, localIp);
        default:
            return {
                statusCode: 405,
                body : JSON.stringify(`${event.httpMethod} not supported on ${event.resource}`)
            }
    }
}

async function routePublicId(event:APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    // supported requests to /{publicId} are:
    // - GET -> returns external foundry url if available
    // - GET /local-> returns internal foundry url if available
    if(event.httpMethod !== "GET"){
        return {
            statusCode: 405,
            body : JSON.stringify(`${event.httpMethod} not supported on ${event.resource}`)
        }
    }
    let pathParameters : {[key:string]:string}  = event.pathParameters ?? {}
    let publicId = pathParameters[URL_PUBLIC_ID_KEY];
    if(!publicId){
        return {
            statusCode: 400,
            body : JSON.stringify(`Required id parameter missing from URL`)
        };
    }
    let isLocal = event.resource.endsWith(URL_RESOURCE_LOCAL)
    return serveFoundryRedirect(publicId, isLocal);
}

export const handler = async (event:APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return routeEvent(event).then(res =>{
        if(!res.headers){
            res.headers = {}
        }
        res.headers["Access-Control-Allow-Headers"] =  "Content-Type";
        res.headers["Access-Control-Allow-Origin"] = "*";
        res.headers["Access-Control-Allow-Methods"] = "OPTIONS,POST,GET";
        return res;
    });
};
