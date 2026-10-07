const test = require("tap").test;
const { makeClientWithMockServer } = require("./utils");
const { awsHandler } = require("../lib/raygun.aws");

test("capture AWS lambda errors", async function (t) {
  // Setup client
  const testEnvironment = await makeClientWithMockServer();
  const client = testEnvironment.client;

  // Setup lambda that crashes
  const lambda = awsHandler({ client }, async (event, context) => {
    throw "error";
  });

  const nextRequest = testEnvironment.nextRequest();

  try {
    // Call to lambda
    await lambda({ event: "event" }, { functionName: "test" });
  } catch (e) {
    // error should be re-thrown to AWS
    t.equal(e, "error");
  }

  const message = await nextRequest;

  testEnvironment.stop();

  t.equal(message.details.error.message, "error");
});

test("pass result to AWS Lambda", async function (t) {
  t.plan(1);
  // Setup client
  const testEnvironment = await makeClientWithMockServer();
  const client = testEnvironment.client;

  // Setup lambda that returns a result
  const lambda = awsHandler({ client }, async (event, context) => {
    return { result: true };
  });

  try {
    // Call to lambda
    const response = await lambda({ event: "event" }, { functionName: "test" });
    t.equal(response.result, true);
  } catch (e) {
    t.fail();
  }

  testEnvironment.stop();
});

test("legacy AWS callback implementation succeeds", async function (t) {
  t.plan(1);
  // Setup client
  const testEnvironment = await makeClientWithMockServer();
  const client = testEnvironment.client;

  // Setup lambda that calls to callback with a result
  const lambda = awsHandler({ client }, (event, context, callback) => {
    callback(null, { result: true });
  });

  try {
    // Call to lambda
    const response = await lambda({ event: "event" }, { functionName: "test" });
    t.equal(response.result, true);
  } catch (e) {
    t.fail();
  }

  testEnvironment.stop();
});

test("legacy AWS callback implementation fails with callback", async function (t) {
  // Setup client
  const testEnvironment = await makeClientWithMockServer();
  const client = testEnvironment.client;

  // Setup lambda that calls to callback with error
  const lambda = awsHandler({ client }, (event, context, callback) => {
    callback("error");
  });

  const nextRequest = testEnvironment.nextRequest();

  try {
    // Call to lambda
    await lambda({ event: "event" }, { functionName: "test" });
  } catch (e) {
    // error should be re-thrown to AWS
    t.equal(e, "error");
  }

  const message = await nextRequest;

  testEnvironment.stop();

  t.equal(message.details.error.message, "error");
});

test("legacy AWS callback implementation fails with throw", async function (t) {
  // Setup client
  const testEnvironment = await makeClientWithMockServer();
  const client = testEnvironment.client;

  // Setup lambda that calls to callback with error
  const lambda = awsHandler({ client }, (event, context, callback) => {
    throw "error";
  });

  const nextRequest = testEnvironment.nextRequest();

  try {
    // Call to lambda
    await lambda({ event: "event" }, { functionName: "test" });
  } catch (e) {
    // error should be re-thrown to AWS
    t.equal(e, "error");
  }

  const message = await nextRequest;

  testEnvironment.stop();

  t.equal(message.details.error.message, "error");
});

test("include scoped breadcrumbs", async function (t) {
  // Setup client
  const testEnvironment = await makeClientWithMockServer();
  const client = testEnvironment.client;

  // Setup lambda that crashes
  const lambda = awsHandler({ client }, async (event, context) => {
    // Add a custom breadcrumb
    client.addBreadcrumb("custom breadcrumb");
    // Fail
    throw "error";
  });

  const nextRequest = testEnvironment.nextRequest();

  try {
    // Call to lambda
    await lambda({ event: "event" }, { functionName: "test" });
  } catch (e) {
    // error should be re-thrown to AWS
    t.equal(e, "error");
  }

  const message = await nextRequest;

  testEnvironment.stop();

  // Includes both internal and custom breadcrumbs
  t.equal(message.details.breadcrumbs.length, 2);
  // internal breadcrumb
  t.equal(message.details.breadcrumbs[0].message, "Running AWS Function: test");
  t.equal(message.details.breadcrumbs[0].customData.functionName, "test");
  // custom breadcrumb
  t.equal(message.details.breadcrumbs[1].message, "custom breadcrumb");
});

for (const callbackStyle of [false, true]) {
  test(`preserve full context payload (${callbackStyle ? "callback" : "async"})`, async (t) => {
    const environment = await makeClientWithMockServer();
    t.teardown(() => environment.stop());
    const metadata = {
      callbackWaitsForEmptyEventLoop: false,
      functionVersion: "42",
      functionName: "privacy-test",
      memoryLimitInMB: "256",
      logGroupName: "/aws/lambda/privacy-test",
      logStreamName: "test-stream",
      invokedFunctionArn:
        "arn:aws:lambda:ap-southeast-2:123456789012:function:privacy-test",
      awsRequestId: "request-123",
    };
    const secret = "private-context-sentinel";
    const context = {
      ...metadata,
      identity: { cognitoIdentityId: secret },
      clientContext: { custom: { token: secret } },
      password: secret,
    };
    const error = new Error("handler failed");
    const checkAndMutate = (event, receivedContext) => {
      t.equal(receivedContext, context, "handler receives original context");
      t.equal(
        event.token,
        "event-only-sentinel",
        "handler receives original event",
      );
      receivedContext.functionName = "updated-function";
      receivedContext.extra = "added-by-handler";
    };
    let handler;
    if (callbackStyle) {
      handler = (event, receivedContext, callback) => {
        checkAndMutate(event, receivedContext);
        callback(error);
      };
    } else {
      handler = async (event, receivedContext) => {
        checkAndMutate(event, receivedContext);
        throw error;
      };
    }
    const lambda = awsHandler({ client: environment.client }, handler);
    const nextRequest = environment.nextRequest();
    try {
      await lambda({ token: "event-only-sentinel" }, context);
      t.fail("handler error must be rethrown");
    } catch (caught) {
      t.equal(caught, error);
    }
    const message = await nextRequest;
    const expectedContext = {
      ...metadata,
      functionName: "updated-function",
      identity: { cognitoIdentityId: secret },
      clientContext: { custom: { token: secret } },
      password: secret,
      extra: "added-by-handler",
    };
    t.same(message.details.userCustomData.context, expectedContext);
    t.same(message.details.breadcrumbs[0].customData, expectedContext);
    t.equal(
      message.details.breadcrumbs[0].message,
      "Running AWS Function: privacy-test",
    );
    t.notMatch(JSON.stringify(message), "event-only-sentinel");
  });
}

for (const callbackStyle of [false, true]) {
  test(`overlapping invocations stay isolated (${callbackStyle ? "callback" : "async"})`, async (t) => {
    const environment = await makeClientWithMockServer();
    t.teardown(() => environment.stop());
    const { client } = environment;
    const release = {};
    const gates = {
      A: new Promise((resolve) => {
        release.A = resolve;
      }),
      B: new Promise((resolve) => {
        release.B = resolve;
      }),
    };
    const errors = { A: new Error("failure-A"), B: new Error("failure-B") };
    const work = async (event) => {
      client.addBreadcrumb(`start-${event.id}`);
      await gates[event.id];
      client.addBreadcrumb(`finish-${event.id}`);
      throw errors[event.id];
    };
    let handler;
    if (callbackStyle) {
      handler = (event, context, callback) => {
        work(event).catch(callback);
      };
    } else {
      handler = work;
    }
    const lambda = awsHandler({ client }, handler);
    const first = lambda(
      { id: "A" },
      {
        functionName: "function-A",
        awsRequestId: "request-A",
        identity: { cognitoIdentityId: "identity-A" },
        clientContext: { custom: { invocation: "A" } },
        applicationField: "application-A",
      },
    ).catch((error) => error);
    const second = lambda(
      { id: "B" },
      {
        functionName: "function-B",
        awsRequestId: "request-B",
        identity: { cognitoIdentityId: "identity-B" },
        clientContext: { custom: { invocation: "B" } },
        applicationField: "application-B",
      },
    ).catch((error) => error);

    release.B();
    t.equal(await second, errors.B);
    t.equal(
      environment.server.entries.length,
      1,
      "B completes while A is suspended",
    );
    release.A();
    t.equal(await first, errors.A);
    t.equal(environment.server.entries.length, 2);
    for (const [index, id] of ["B", "A"].entries()) {
      const message = environment.server.entries[index];
      const context = {
        functionName: `function-${id}`,
        awsRequestId: `request-${id}`,
        identity: { cognitoIdentityId: `identity-${id}` },
        clientContext: { custom: { invocation: id } },
        applicationField: `application-${id}`,
      };
      t.equal(message.details.error.message, `failure-${id}`);
      t.same(message.details.userCustomData.context, context);
      t.same(message.details.breadcrumbs[0].customData, context);
      t.same(
        message.details.breadcrumbs.map((crumb) => crumb.message),
        [`Running AWS Function: function-${id}`, `start-${id}`, `finish-${id}`],
      );
    }
  });
}
