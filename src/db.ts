import * as AWS from "aws-sdk";

export const TABLE_NAME = "FoundryRedirects";
export interface RedirectTableItem {
    public_id: string,
    foundry_id : string,
    local_address : string,
    external_address : string,
}
export namespace TableKeys {
    export const FoundryIdKey = 'foundry_id';
    export const PublicIdKey = 'public_id';
}

AWS.config.update({
    region: "us-west-2",
});

export const dbDocClient = new AWS.DynamoDB.DocumentClient();