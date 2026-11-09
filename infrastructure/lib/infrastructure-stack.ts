import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { WafwebaclToApiGateway } from '@aws-solutions-constructs/aws-wafwebacl-apigateway';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps, Token, Validations } from 'aws-cdk-lib';
import { RequestValidator, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Mfa, UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { APIGatewayConstruct } from './common/apigateway/apiGateway';
import { WebACLConstruct } from './common/webacl/webacl';
import { DDBTableConstructs } from './constructs/ddb-tables';
import { Frontend } from './constructs/frontend';
import { ItemApiConstruct } from './constructs/item-api';
import { OrderApiConstruct } from './constructs/order-api';
// Properties for the ordering-stack

export class InfrastructureStack extends Stack {
  readonly userPool: UserPool;
  readonly client: UserPoolClient;
  readonly apigw: RestApi;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const TokenPath = 'partnerToken'
    /** Create Cloudwatch Policy for Lambda */

    const cloudWatchPolicyStatement = new PolicyStatement({
      actions: ["logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"],
      resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*:*`],
    });
    const cloudWatchPolicy = new Policy(this, `${id}-cloudwatch-policy`, {
      statements: [cloudWatchPolicyStatement],
    });

    const webacl = new WebACLConstruct(this, `${id}-webacl`);
    /** 
     * Create Partner API Mock versions
     */
    const partnerInventoryApi = new APIGatewayConstruct(this, 'partnerInventoryApi', {
      apiname: 'mock-inventory-api',
      cloudWatchPolicyStatement: cloudWatchPolicyStatement,
      TOKEN_PATH: TokenPath,
      webacl: webacl.wafwebacl
    });


    /** 
     * Create Datastore required for this service
     *  Order table and partner Table
     */
    const dynamoDBTables = new DDBTableConstructs(this, 'DatabaseStack', {
      partnerMockAPIUrl: partnerInventoryApi.api.url,
      cloudWatchPolicyStatement: cloudWatchPolicyStatement
    });

    // Setup the API with Cognito user pool
    const congitoToApiGwToLambda = new CognitoToApiGatewayToLambda(this, 'endless-aisle-api', {
      lambdaFunctionProps: {
        functionName: `endless-aisle-cognito-lambda`,
        description: `Lambda Function to handle authorization for endless aisle requests.`,
        runtime: Runtime.NODEJS_24_X,
        code: Code.fromAsset(`${__dirname}/lambda/`),
        handler: 'cognito.handler',
        timeout: Duration.seconds(15),
      },
      apiGatewayProps: {
        restApiName: "endless-aisle-api",
        proxy: false,
        description: 'Endless Aisle handler API'
      },
      cognitoUserPoolProps: {
        selfSignUpEnabled: false,
        mfa: Mfa.OPTIONAL,
        mfaSecondFactor: { otp: true, sms: false },
        passwordPolicy: {
          minLength: 12,
          requireLowercase: true,
          requireUppercase: true,
          requireDigits: true,
          requireSymbols: true,
          tempPasswordValidity: Duration.days(1),
        },
        removalPolicy: RemovalPolicy.DESTROY,
      },
      cognitoUserPoolClientProps: {
        generateSecret: false,
        refreshTokenValidity: Duration.hours(2),
        // The website signs in with the Amplify Authenticator (SRP), so only SRP and
        // refresh are needed. Plain USER_PASSWORD_AUTH is deliberately not enabled.
        authFlows: {
          userSrp: true
        },
        // Do not reveal whether a username exists on failed sign-in.
        preventUserExistenceErrors: true,
        enableTokenRevocation: true,
        oAuth: {
          flows: {
            // The implicit grant returns tokens in the URL fragment and is deprecated
            // by OAuth 2.0 Security BCP; use the authorization code grant (with PKCE) instead.
            authorizationCodeGrant: true,
            implicitCodeGrant: false,
            clientCredentials: false
          }
        }
      }
    });

    new RequestValidator(this, `${id}-cognito-request-validator`, {
      restApi: congitoToApiGwToLambda.apiGateway,
      // the properties below are optional
      requestValidatorName: 'cognito-request-validator',
      validateRequestBody: true,
      validateRequestParameters: true,
    });

    congitoToApiGwToLambda.lambdaFunction.role?.attachInlinePolicy(cloudWatchPolicy);
    /**
     * Order API
     * */

    const orderapi = new OrderApiConstruct(this, 'order-api', {
      ordertable: dynamoDBTables.ordertable,
      partnertable: dynamoDBTables.partnertable,
      partnerInventoryApi: partnerInventoryApi.api,
      env: {
        account: props.env?.account,
        region: props.env?.region
      },
      lambdaEnviroment: {
        ORDER_TABLE_PK: 'orderId',
        PARTNER_TABLE_PK: 'partnerId',
        ORDER_TABLE_ARN: dynamoDBTables.ordertable.tableArn,
        PARTNER_TABLE_ARN: dynamoDBTables.partnertable.tableArn,
        ORDER_TABLE_NAME: dynamoDBTables.ordertable.tableName,
        PARTNER_TABLE_NAME: dynamoDBTables.partnertable.tableName,
        TOKEN_PATH: TokenPath
      },
      congitoToApiGwToLambdaRestApi: congitoToApiGwToLambda.apiGateway,
      cloudWatchPolicy: cloudWatchPolicy
    });
    /**
     * Items API
     * */

    const itemapi = new ItemApiConstruct(this, 'item-api', {
      ordertable: dynamoDBTables.ordertable,
      partnertable: dynamoDBTables.partnertable,
      partnerInventoryApi: partnerInventoryApi.api,
      env: {
        account: props.env?.account,
        region: props.env?.region,
      },
      STORE_EMAIL: process.env.STORE_EMAIL,
      lambdaEnviroment: {
        ORDER_TABLE_PK: 'orderId',
        PARTNER_TABLE_PK: 'partnerId',
        ORDER_TABLE_ARN: dynamoDBTables.ordertable.tableArn,
        PARTNER_TABLE_ARN: dynamoDBTables.partnertable.tableArn,
        ORDER_TABLE_NAME: dynamoDBTables.ordertable.tableName,
        PARTNER_TABLE_NAME: dynamoDBTables.partnertable.tableName,
        TOKEN_PATH: TokenPath
      },
      congitoToApiGwToLambdaRestApi: congitoToApiGwToLambda.apiGateway,
      cloudWatchPolicyStatement: cloudWatchPolicyStatement
    });

    // Add the authorizers to the API

    congitoToApiGwToLambda.addAuthorizers();

    // This construct can only be attached to a configured API Gateway.
    new WafwebaclToApiGateway(this, `${id}-wafwebacl-apigateway`, {
      existingApiGatewayInterface: congitoToApiGwToLambda.apiGateway,
      existingWebaclObj: webacl.wafwebacl
    });

    this.userPool = congitoToApiGwToLambda.userPool;
    this.client = congitoToApiGwToLambda.userPoolClient;
    this.apigw = congitoToApiGwToLambda.apiGateway;

    const accessToken = new Secret(this, "partnerToken", {
      secretName: TokenPath
    });
    accessToken.grantRead(partnerInventoryApi.inventoryLambda);
    accessToken.grantRead(orderapi.createOrderLambda);
    accessToken.grantRead(itemapi.getItemLambda);

    const wafwebaclToCloudFrontToS3 = new Frontend(this, 'EndlessAisleFrontEnd', {
      env: {
        account: props.env?.account,
        region: props.env?.region
      },
      userpool: this.userPool,
      client: this.client,
      backendApi: this.apigw.url,
    });

    new CfnOutput(this, "cloudfrontURL", { value: `https://${wafwebaclToCloudFrontToS3.distribution.distributionDomainName}` });


    new CfnOutput(this, 'userPoolId', {
      value: this.userPool.userPoolId
    });
    new CfnOutput(this, 'userPoolClientId', {
      value: this.client.userPoolClientId,
    });
    new CfnOutput(this, 'region', {
      value: this.region
    });

    acknowledgeNagFindings(this);
  }
}

/**
 * cdk-nag v3 needs each finding acknowledged individually. These are the accepted
 * findings for this sample, with the reason for each.
 */
function acknowledgeNagFindings(stack: Stack) {
  // Finding IDs embed the account/region when they are known at synth time.
  const region = Token.isUnresolved(stack.region) ? '<AWS::Region>' : stack.region;
  const account = Token.isUnresolved(stack.account) ? '<AWS::AccountId>' : stack.account;
  const iam5 = (finding: string, reason: string) => ({ id: `AwsSolutions-IAM5[${finding}]`, reason });

  const lambdaLogs = 'Lambda functions need to create their own log groups and streams under /aws/lambda/.';
  const ddbIndexes = 'Grants generated by table.grantReadData/grantReadWriteData include the table\'s GSIs, which are needed for queries.';
  const websiteBuild = 'Permissions generated by @cdklabs/deploy-time-build for the CodeBuild project that builds and uploads the website.';

  Validations.of(stack).acknowledge(
    { id: 'AwsSolutions-SMG4', reason: 'The partner token is a demo shared secret for the mock partner API; rotation is out of scope for the sample.' },
    { id: 'AwsSolutions-COG4', reason: 'The mock partner API is protected by a custom Lambda REQUEST authorizer (shared partner token), not Cognito, because partners are machine clients.' },
    { id: 'AwsSolutions-COG2', reason: 'TOTP MFA is enabled as OPTIONAL so store associates can enroll; set Mfa.REQUIRED for production.' },
    { id: 'AwsSolutions-COG8', reason: 'Cognito Plus feature plan (threat protection) is a paid tier and out of scope for the sample. Enable it for production.' },
    { id: 'AwsSolutions-CFR1', reason: 'The sample has no geo restriction requirement.' },
    { id: 'AwsSolutions-CFR2', reason: 'CloudFront web ACLs must be created in us-east-1; the API Gateway stages are protected by AWS WAF instead. Add a CloudFront web ACL for production.' },
    { id: 'AwsSolutions-CFR4', reason: 'The distribution uses the default *.cloudfront.net certificate, for which CloudFront always allows TLSv1. Use a custom domain and certificate for TLSv1.2_2021.' },
    { id: 'AwsSolutions-S1', reason: 'This bucket is the access-log destination for CloudFront and the asset bucket; logging it to itself would loop.' },
    { id: 'AwsSolutions-CB4', reason: 'The CodeBuild project created by @cdklabs/deploy-time-build only builds public website assets; the default AWS-managed encryption is sufficient.' },
    { id: 'AwsSolutions-L1', reason: 'The singleton custom-resource handler runtime is controlled by @cdklabs/deploy-time-build.' },
    { id: 'AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]', reason: 'Managed basic execution role used by the @cdklabs/deploy-time-build custom-resource handler.' },
    iam5(`Resource::arn:aws:logs:${region}:${account}:log-group:/aws/lambda/*:*`, lambdaLogs),
    iam5('Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:/aws/lambda/*', lambdaLogs),
    iam5('Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:*', 'API Gateway account-level CloudWatch role created by AWS Solutions Constructs for execution logging.'),
    iam5('Resource::*', 'AWS X-Ray PutTraceSegments/PutTelemetryRecords added by AWS Solutions Constructs do not support resource-level permissions.'),
    iam5('Resource::<DatabaseStackOrderStoreStackorderstableAD9B02B6.Arn>/index/*', ddbIndexes),
    iam5('Resource::<DatabaseStackPartnerStoreStackpartnerstable21B48BAD.Arn>/index/*', ddbIndexes),
    iam5(`Resource::arn:aws:logs:${region}:${account}:log-group:/aws/codebuild/<EndlessAisleFrontEndWebsiteBuildProjectE0FA1737>:*`, websiteBuild),
    iam5(`Resource::arn:aws:codebuild:${region}:${account}:report-group/<EndlessAisleFrontEndWebsiteBuildProjectE0FA1737>-*`, websiteBuild),
    iam5(`Resource::arn:aws:s3:::cdk-hnb659fds-assets-${account}-${region}/*`, websiteBuild),
    iam5('Resource::<EndlessAisleFrontEndAssetBucket9CD7B1B4.Arn>/*', websiteBuild),
    iam5('Action::s3:Abort*', websiteBuild),
    iam5('Action::s3:DeleteObject*', websiteBuild),
    iam5('Action::s3:GetBucket*', websiteBuild),
    iam5('Action::s3:GetObject*', websiteBuild),
    iam5('Action::s3:List*', websiteBuild),
  );
}
