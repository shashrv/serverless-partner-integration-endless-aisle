# Endless Aisle website

React 18 single-page app built with [Vite](https://vite.dev/) and [AWS Amplify v6](https://docs.amplify.aws/react/).

The CDK stack builds and deploys this app automatically during `cdk deploy`, injecting the
API URL and Cognito settings as `VITE_*` environment variables.

## Local development

1. Deploy the infrastructure stack once.
2. Copy `.env.example` to `.env.local` and fill in the values from the stack outputs.
3. Run:

```bash
npm ci
npm run dev   # http://127.0.0.1:3000
```

`npm run build` writes the production bundle to `dist/`.
