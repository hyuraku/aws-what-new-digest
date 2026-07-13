import { describe, expect, it } from 'vitest'
import { buildDisplayAliasMap, buildProductIdMap, SERVICES } from '../scripts/lib/service-names.js'

/**
 * SERVICES テーブルへの一元化前に collector.ts / category-normalizer.ts に
 * リテラルで存在していたマップのスナップショット。
 * 生成結果がこれと完全一致すること = リファクタリングが挙動を変えていないことの保証。
 * （新サービスを SERVICES に追加した場合は、このスナップショットにも追記すること）
 */
const LEGACY_SERVICE_NAME_MAP: Record<string, string> = {
  ec2: 'EC2',
  s3: 'S3',
  'amazon-s3': 'S3',
  lambda: 'Lambda',
  rds: 'RDS',
  'amazon-rds': 'RDS',
  dynamodb: 'DynamoDB',
  'amazon-dynamodb': 'DynamoDB',
  ecs: 'ECS',
  'amazon-ecs': 'ECS',
  eks: 'EKS',
  'amazon-eks': 'EKS',
  cloudfront: 'CloudFront',
  'amazon-cloudfront': 'CloudFront',
  cloudwatch: 'CloudWatch',
  'amazon-cloudwatch': 'CloudWatch',
  sqs: 'SQS',
  'amazon-sqs': 'SQS',
  sns: 'SNS',
  'amazon-sns': 'SNS',
  iam: 'IAM',
  'aws-iam': 'IAM',
  vpc: 'VPC',
  'amazon-vpc': 'VPC',
  route53: 'Route 53',
  'amazon-route-53': 'Route 53',
  elasticache: 'ElastiCache',
  'amazon-elasticache': 'ElastiCache',
  bedrock: 'Bedrock',
  'amazon-bedrock': 'Bedrock',
  sagemaker: 'SageMaker',
  'amazon-sagemaker': 'SageMaker',
  athena: 'Athena',
  'amazon-athena': 'Athena',
  glue: 'Glue',
  'aws-glue': 'Glue',
  kinesis: 'Kinesis',
  'amazon-kinesis': 'Kinesis',
  redshift: 'Redshift',
  'amazon-redshift': 'Redshift',
  apigateway: 'API Gateway',
  'amazon-api-gateway': 'API Gateway',
  cognito: 'Cognito',
  'amazon-cognito': 'Cognito',
  stepfunctions: 'Step Functions',
  'aws-step-functions': 'Step Functions',
  eventbridge: 'EventBridge',
  'amazon-eventbridge': 'EventBridge',
  codebuild: 'CodeBuild',
  'aws-codebuild': 'CodeBuild',
  codepipeline: 'CodePipeline',
  'aws-codepipeline': 'CodePipeline',
  codecommit: 'CodeCommit',
  'aws-codecommit': 'CodeCommit',
  codedeploy: 'CodeDeploy',
  'aws-codedeploy': 'CodeDeploy',
  secretsmanager: 'Secrets Manager',
  'aws-secrets-manager': 'Secrets Manager',
  ssm: 'Systems Manager',
  'aws-systems-manager': 'Systems Manager',
  kms: 'KMS',
  'aws-kms': 'KMS',
  waf: 'WAF',
  'aws-waf': 'WAF',
  guardduty: 'GuardDuty',
  'amazon-guardduty': 'GuardDuty',
  inspector: 'Inspector',
  'amazon-inspector': 'Inspector',
  securityhub: 'Security Hub',
  'aws-security-hub': 'Security Hub',
  amplify: 'Amplify',
  'aws-amplify': 'Amplify',
  appsync: 'AppSync',
  'aws-appsync': 'AppSync',
  lightsail: 'Lightsail',
  'amazon-lightsail': 'Lightsail',
  elasticbeanstalk: 'Elastic Beanstalk',
  'aws-elastic-beanstalk': 'Elastic Beanstalk',
  fargate: 'Fargate',
  'aws-fargate': 'Fargate',
  ecr: 'ECR',
  'amazon-ecr': 'ECR',
}

const LEGACY_DISPLAY_NAME_MAP: Record<string, string> = {
  Ec2: 'EC2',
  Rds: 'RDS',
  Ecs: 'ECS',
  Eks: 'EKS',
  Iam: 'IAM',
  Vpc: 'VPC',
  Sqs: 'SQS',
  Sns: 'SNS',
  Kms: 'KMS',
  Waf: 'WAF',
  Mwaa: 'MWAA',
  Msk: 'MSK',
  Mq: 'MQ',
  S3: 'S3',
  Sagemaker: 'SageMaker',
  Cloudwatch: 'CloudWatch',
  Cloudfront: 'CloudFront',
  Cloudtrail: 'CloudTrail',
  Cloudformation: 'CloudFormation',
  Quicksight: 'QuickSight',
  Documentdb: 'DocumentDB',
  Dynamodb: 'DynamoDB',
  Opensearch: 'OpenSearch',
  'Opensearch Service': 'OpenSearch',
  Elasticache: 'ElastiCache',
  Guardduty: 'GuardDuty',
  Appsync: 'AppSync',
  Codebuild: 'CodeBuild',
  Codepipeline: 'CodePipeline',
  Codecommit: 'CodeCommit',
  Codedeploy: 'CodeDeploy',
  Eventbridge: 'EventBridge',
  Healthlake: 'HealthLake',
  Healthimaging: 'HealthImaging',
  'Iot Device Management': 'IoT Device Management',
  'Iot Core': 'IoT Core',
  'Identity And Access Management': 'IAM',
  'Simple Email Service': 'SES',
  'Nice Dcv': 'NICE DCV',
  'Appstream 2 0': 'AppStream 2.0',
  'Rds For Sql Server': 'RDS for SQL Server',
  'Fsx Netapp Ontap': 'FSx for NetApp ONTAP',
  'Fsx For Openzfs': 'FSx for OpenZFS',
  'Govcloud Us': 'GovCloud (US)',
  'Sagemaker Studio': 'SageMaker Studio',
  'Sagemaker Jumpstart': 'SageMaker JumpStart',
  'Elemental Mediaconvert': 'Elemental MediaConvert',
  'Iam Identity Center': 'IAM Identity Center',
  'Managed Service For Grafana': 'Managed Grafana',
  'Managed Service For Apache Flink': 'Managed Service for Apache Flink',
}

describe('service-names の一元化マイグレーション', () => {
  it('buildProductIdMap が旧 SERVICE_NAME_MAP と完全一致する', () => {
    expect(buildProductIdMap()).toEqual(LEGACY_SERVICE_NAME_MAP)
  })

  it('buildDisplayAliasMap が旧 DISPLAY_NAME_MAP と完全一致する', () => {
    expect(buildDisplayAliasMap()).toEqual(LEGACY_DISPLAY_NAME_MAP)
  })

  it('display が SERVICES 内で重複していない', () => {
    const displays = SERVICES.map((s) => s.display)
    expect(new Set(displays).size).toBe(displays.length)
  })

  it('productId が複数のサービスに割り当てられていない', () => {
    const ids = SERVICES.flatMap((s) => s.productIds ?? [])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('legacyAlias が複数のサービスに割り当てられていない', () => {
    const aliases = SERVICES.flatMap((s) => s.legacyAliases ?? [])
    expect(new Set(aliases).size).toBe(aliases.length)
  })
})
