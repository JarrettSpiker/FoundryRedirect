exports.handler = async (event) => {
    const response = {
        statusCode: 301,
        headers: {
            Location: 'http://192.168.2.62:30000/'
        },
    };
    return response;
};
