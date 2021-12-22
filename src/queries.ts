import { dbDocClient, RedirectTableItem, TableKeys, TABLE_NAME } from "./db";

export async function scanForRowWithPublicId(publicId:string) {
    let query = dbDocClient.scan({
        TableName: TABLE_NAME,
        ExpressionAttributeNames: {
            "#f": `${TableKeys.PublicIdKey}`
        },
        ExpressionAttributeValues: {
            ':f' : publicId
        },
        FilterExpression: '#f = :f',
    });

    return query.promise();
}

export async function getEntryForFoundryId(foundryId:string): Promise<RedirectTableItem|undefined>{
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
    const result = await queryPromise;
    if(result.Count > 0) {
        return <RedirectTableItem> result.Items[0];
    }
}