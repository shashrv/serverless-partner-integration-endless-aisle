// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { NodejsBuild } from '@cdklabs/deploy-time-build';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  Distribution,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  HttpVersion,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { BlockPublicAccess, Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface FrontendProps {
  readonly userpool: UserPool
  readonly client: UserPoolClient,
  readonly backendApi: string,
  env: {
    account?: string,
    region?: string
  }
}

export class Frontend extends Construct {
  readonly distribution: Distribution;
  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id);

    const accessLogBucket = new Bucket(this, 'AccessLogBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      // Retained on stack deletion: CloudFront delivers logs minutes late, so emptying the
      // bucket during teardown races with new log files and fails the delete. Objects
      // expire after 30 days, so a retained bucket empties itself.
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [{
        id: 'expire-access-logs',
        expiration: Duration.days(30),
        abortIncompleteMultipartUploadAfter: Duration.days(1),
      }],
      // CloudFront standard logging (legacy) writes with ACLs, so it needs OBJECT_WRITER.
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
    });

    const assetBucket = new Bucket(this, 'AssetBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: 'AssetBucket/',
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const cognitoOrigin = `https://cognito-idp.${Stack.of(this).region}.amazonaws.com`;

    // Security headers for the single-page app. The CSP restricts scripts to this
    // origin and API calls to the backend API and Cognito.
    const securityHeaders = new ResponseHeadersPolicy(this, 'SecurityHeaders', {
      comment: 'Security headers for the Endless Aisle website',
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self' data:",
            `connect-src 'self' ${cognitoOrigin} https://*.execute-api.${Stack.of(this).region}.amazonaws.com`,
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
          ].join('; '),
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: true,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
      },
    });

    // Origin Access Control replaces the legacy Origin Access Identity.
    const distribution = new Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      httpVersion: HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(assetBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: securityHeaders,
      },
      // Single-page app routing: serve index.html for client-side routes.
      errorResponses: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: Duration.seconds(0) },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: Duration.seconds(0) },
      ],
      enableLogging: true,
      logBucket: accessLogBucket,
      logFilePrefix: 'Frontend/',
    });

    new NodejsBuild(this, 'WebsiteBuild', {
      assets: [
        {
          path: '../website',
          exclude: ['node_modules', 'dist', 'build', '.env.local'],
          // npm ci installs exactly what is in package-lock.json.
          commands: ['npm ci --no-audit --no-fund'],
        },
      ],
      nodejsVersion: 24,
      buildCommands: ['npm run build'],
      buildEnvironment: {
        VITE_API_URL: props.backendApi,
        VITE_USER_POOL_ID: props.userpool.userPoolId,
        VITE_USER_POOL_CLIENT_ID: props.client.userPoolClientId,
        VITE_AWS_REGION: Stack.of(props.userpool).region,
      },
      destinationBucket: assetBucket,
      distribution,
      outputSourceDirectory: 'dist',
    });

    this.distribution = distribution;
  }
}
