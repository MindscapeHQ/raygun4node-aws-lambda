# Raygun + AWS Lambda Example

This is a sample AWS Lambda function to show how to use Raygun4Node and AWS Lambda together.

This example uses `@raygun/aws-lambda` from local path:

```json
"dependencies": {
  "@raygun.io/aws-lambda": "file:../"
}
```

Installing the `raygun` dependency is not necessary, as `@raygun.io/aws-lambda` already depends on `raygun` package.

## Prepare package

Run the `prepare.sh` script.

This script installs the dependencies, builds the example, and packages it in the `example.zip` file.

We recommend running the script from a terminal, to check that everything runs as expected.

## Deploy

To run this example, you have to create first an AWS Lambda function.

Follow the instructions in AWS' website: https://docs.aws.amazon.com/lambda/latest/dg/getting-started.html

Once your function is ready, use the "Upload from" to upload the generated `example.zip` file.

![Upload Image](../assets/example-1.png)

## Example setup

Before running the example, you have to complete the following setup.

1. Add `RAYGUN` environment variable with your API key.
2. Add `DEBUG` environment variable with the value `raygun` to see detailed logs.

![Environment Variables](../assets/example-2.png)

3. Under the `Test` tab, create a new event with the following content:

![Error event](../assets/example-3.png)

## Run the sample

Finally, select the newly created event and click the "Test" button.

![Send test](../assets/example-4.png)

You should see execution results similar to these:

```
Test Event Name
RaygunError

Response
{
  "errorType": "string",
  "errorMessage": "It's an AWS error!",
  "trace": []
}

Function Logs
START RequestId: xyz Version: $LATEST
2024-06-06T08:33:41.023Z raygun [raygun.breadcrumbs.ts] running async function with breadcrumbs
2024-06-06T08:33:41.062Z raygun [raygun.breadcrumbs.ts] recorded breadcrumb: xyz
2024-06-06T08:33:41.063Z raygun [raygun.messageBuilder.ts] Added breadcrumbs: 1
2024-06-06T08:33:41.542Z	xyz ERROR	Invoke Error 	{"errorType":"Error","errorMessage":"AWS Error from callback!","stack":["Error: AWS Error from callback!","  ....
2024-06-06T08:33:41.542Z raygun [raygun.ts] Successfully sent message (duration=479ms)
END RequestId: xyz
REPORT RequestId: xyz	Duration: 627.86 ms	Billed Duration: 628 ms	Memory Size: 128 MB	Max Memory Used: 78 MB

Request ID
xyz
```

The sent error should appear on your Raygun Crash Reporting console as well.
