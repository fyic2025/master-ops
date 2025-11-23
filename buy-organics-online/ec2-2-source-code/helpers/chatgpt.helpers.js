const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

exports.runChatGpt = async (message = "say hello") => {
  return new Promise(async (res) => {
    console.log('running chatgpt... ',message)
    console.time("chatgpt");
    const response = await openai
      .createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      })
      .catch((e) => {
        console.log(e);
      });
    let content = response?.data?.choices?.[0]?.message?.content;
    console.timeEnd("chatgpt");
    console.log('finish chatgpt... ',message)
    res(content || "");
  });

  // const response = await openai.createCompletion({
  //   model: "text-davinci-003",
  //   prompt: "Write a description of Biologika Live It Up Deodorant Roll On 70ml ",
  //   temperature: 0,
  //   max_tokens: 7,
  // });

  // openai.ChatCompletion.create(
  //   model="gpt-3.5-turbo",
  //   messages=[
  //         {"role": "system", "content": "You are a helpful assistant."},
  //         {"role": "user", "content": "Who won the world series in 2020?"},
  //         {"role": "assistant", "content": "The Los Angeles Dodgers won the World Series in 2020."},
  //         {"role": "user", "content": "Where was it played?"}
  //     ]
  // )
};
let r = {
  message: "Request failed with status code 429",
  name: "Error",
  stack:
    "Error: Request failed with status code 429\n    at createError (/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/node_modules/openai/node_modules/axios/lib/core/createError.js:16:15)\n    at settle (/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/node_modules/openai/node_modules/axios/lib/core/settle.js:17:12)\n    at IncomingMessage.handleStreamEnd (/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/node_modules/openai/node_modules/axios/lib/adapters/http.js:322:11)\n    at IncomingMessage.emit (node:events:402:35)\n    at endReadableNT (node:internal/streams/readable:1343:12)\n    at processTicksAndRejections (node:internal/process/task_queues:83:21)",
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false,
    },
    transformRequest: [null],
    transformResponse: [null],
    timeout: 0,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
    maxContentLength: -1,
    maxBodyLength: -1,
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "User-Agent": "OpenAI/NodeJS/3.2.1",
      Authorization:
        "Bearer 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",
      "Content-Length": 73,
    },
    method: "post",
    data: '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello!"}]}',
    url: "https://api.openai.com/v1/completions",
  },
  status: 429,
};
