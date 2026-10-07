const test = require("tap").test;
const { Client } = require("raygun");
const { makeClientWithMockServer } = require("./utils");

test("actual Lambda sample reports its error to a local endpoint", async (t) => {
  const environment = await makeClientWithMockServer();
  t.teardown(() => environment.stop());
  const init = Client.prototype.init;
  let sampleClient;
  Client.prototype.init = function (options) {
    sampleClient = this;
    return init.call(this, {
      ...options,
      apiKey: "TEST_API_KEY",
      host: "localhost",
      port: environment.address.port,
      useSSL: false,
    });
  };
  let handler;
  try {
    ({ handler } = require("../example/index"));
  } finally {
    Client.prototype.init = init;
  }
  t.teardown(() => sampleClient.stop());

  t.equal(await handler({}, { functionName: "sample-success" }), "all good!");
  t.equal(environment.server.entries.length, 0);
  const nextRequest = environment.nextRequest();
  await t.rejects(
    handler(
      { error: true, token: "event-only-sentinel" },
      {
        functionName: "sample-failure",
        awsRequestId: "sample-request",
        identity: { cognitoIdentityId: "sample-identity" },
        clientContext: { custom: { client: "sample-client" } },
        applicationField: "sample-application-field",
      },
    ),
    /It's an AWS error!/,
  );
  const message = await nextRequest;
  t.equal(environment.server.entries.length, 1);
  t.equal(message.details.error.message, "It's an AWS error!");
  t.same(message.details.tags, ["AWS Handler"]);
  t.same(message.details.userCustomData.context, {
    functionName: "sample-failure",
    awsRequestId: "sample-request",
    identity: { cognitoIdentityId: "sample-identity" },
    clientContext: { custom: { client: "sample-client" } },
    applicationField: "sample-application-field",
  });
  t.same(message.details.breadcrumbs[0].customData, {
    functionName: "sample-failure",
    awsRequestId: "sample-request",
    identity: { cognitoIdentityId: "sample-identity" },
    clientContext: { custom: { client: "sample-client" } },
    applicationField: "sample-application-field",
  });
  t.same(
    message.details.breadcrumbs.map((crumb) => crumb.message),
    [
      "Running AWS Function: sample-failure",
      "breadcrumb on event received",
      "event has error data!",
    ],
  );
  t.notMatch(JSON.stringify(message), "event-only-sentinel");
});
