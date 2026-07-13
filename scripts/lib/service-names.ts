/**
 * AWSサービス名の単一情報源（Single Source of Truth）
 *
 * 従来は collector.ts の SERVICE_NAME_MAP（収集時: productId → 表示名）と
 * category-normalizer.ts の DISPLAY_NAME_MAP（表示時: 過去データの表記揺れ → 公式表記）が
 * 独立して管理され、新サービス追加時に2箇所の更新判断が必要だった。
 *
 * このファイルに1エントリ追加すれば両方に反映される:
 * - productIds: RSSカテゴリ "general:products/{id}" の id。収集時の一次正規化に使う。
 * - legacyAliases: 過去データに残っている表記揺れ（productId 漏れ時のタイトルケース化
 *   フォールバックが生んだもの等）。表示時の二次正規化に使う。
 *
 * どちらも該当がなければ省略してよい。
 */

export interface ServiceDefinition {
  /** 公式表記の表示名（例: "EC2", "SageMaker"） */
  display: string
  /** RSSフィードのプロダクトID（収集時の一次正規化） */
  productIds?: string[]
  /** 過去データの表記揺れ（表示時の二次正規化） */
  legacyAliases?: string[]
}

export const SERVICES: ServiceDefinition[] = [
  { display: 'EC2', productIds: ['ec2'], legacyAliases: ['Ec2'] },
  { display: 'S3', productIds: ['s3', 'amazon-s3'], legacyAliases: ['S3'] },
  { display: 'Lambda', productIds: ['lambda'] },
  { display: 'RDS', productIds: ['rds', 'amazon-rds'], legacyAliases: ['Rds'] },
  { display: 'DynamoDB', productIds: ['dynamodb', 'amazon-dynamodb'], legacyAliases: ['Dynamodb'] },
  { display: 'ECS', productIds: ['ecs', 'amazon-ecs'], legacyAliases: ['Ecs'] },
  { display: 'EKS', productIds: ['eks', 'amazon-eks'], legacyAliases: ['Eks'] },
  {
    display: 'CloudFront',
    productIds: ['cloudfront', 'amazon-cloudfront'],
    legacyAliases: ['Cloudfront'],
  },
  {
    display: 'CloudWatch',
    productIds: ['cloudwatch', 'amazon-cloudwatch'],
    legacyAliases: ['Cloudwatch'],
  },
  { display: 'SQS', productIds: ['sqs', 'amazon-sqs'], legacyAliases: ['Sqs'] },
  { display: 'SNS', productIds: ['sns', 'amazon-sns'], legacyAliases: ['Sns'] },
  {
    display: 'IAM',
    productIds: ['iam', 'aws-iam'],
    legacyAliases: ['Iam', 'Identity And Access Management'],
  },
  { display: 'VPC', productIds: ['vpc', 'amazon-vpc'], legacyAliases: ['Vpc'] },
  { display: 'Route 53', productIds: ['route53', 'amazon-route-53'] },
  {
    display: 'ElastiCache',
    productIds: ['elasticache', 'amazon-elasticache'],
    legacyAliases: ['Elasticache'],
  },
  { display: 'Bedrock', productIds: ['bedrock', 'amazon-bedrock'] },
  {
    display: 'SageMaker',
    productIds: ['sagemaker', 'amazon-sagemaker'],
    legacyAliases: ['Sagemaker'],
  },
  { display: 'Athena', productIds: ['athena', 'amazon-athena'] },
  { display: 'Glue', productIds: ['glue', 'aws-glue'] },
  { display: 'Kinesis', productIds: ['kinesis', 'amazon-kinesis'] },
  { display: 'Redshift', productIds: ['redshift', 'amazon-redshift'] },
  { display: 'API Gateway', productIds: ['apigateway', 'amazon-api-gateway'] },
  { display: 'Cognito', productIds: ['cognito', 'amazon-cognito'] },
  { display: 'Step Functions', productIds: ['stepfunctions', 'aws-step-functions'] },
  {
    display: 'EventBridge',
    productIds: ['eventbridge', 'amazon-eventbridge'],
    legacyAliases: ['Eventbridge'],
  },
  {
    display: 'CodeBuild',
    productIds: ['codebuild', 'aws-codebuild'],
    legacyAliases: ['Codebuild'],
  },
  {
    display: 'CodePipeline',
    productIds: ['codepipeline', 'aws-codepipeline'],
    legacyAliases: ['Codepipeline'],
  },
  {
    display: 'CodeCommit',
    productIds: ['codecommit', 'aws-codecommit'],
    legacyAliases: ['Codecommit'],
  },
  {
    display: 'CodeDeploy',
    productIds: ['codedeploy', 'aws-codedeploy'],
    legacyAliases: ['Codedeploy'],
  },
  { display: 'Secrets Manager', productIds: ['secretsmanager', 'aws-secrets-manager'] },
  { display: 'Systems Manager', productIds: ['ssm', 'aws-systems-manager'] },
  { display: 'KMS', productIds: ['kms', 'aws-kms'], legacyAliases: ['Kms'] },
  { display: 'WAF', productIds: ['waf', 'aws-waf'], legacyAliases: ['Waf'] },
  {
    display: 'GuardDuty',
    productIds: ['guardduty', 'amazon-guardduty'],
    legacyAliases: ['Guardduty'],
  },
  { display: 'Inspector', productIds: ['inspector', 'amazon-inspector'] },
  { display: 'Security Hub', productIds: ['securityhub', 'aws-security-hub'] },
  { display: 'Amplify', productIds: ['amplify', 'aws-amplify'] },
  { display: 'AppSync', productIds: ['appsync', 'aws-appsync'], legacyAliases: ['Appsync'] },
  { display: 'Lightsail', productIds: ['lightsail', 'amazon-lightsail'] },
  { display: 'Elastic Beanstalk', productIds: ['elasticbeanstalk', 'aws-elastic-beanstalk'] },
  { display: 'Fargate', productIds: ['fargate', 'aws-fargate'] },
  { display: 'ECR', productIds: ['ecr', 'amazon-ecr'] },
  // --- 以下は過去データの表記揺れ補正のみ（収集時のproductIdマッピング未登録） ---
  { display: 'MWAA', legacyAliases: ['Mwaa'] },
  { display: 'MSK', legacyAliases: ['Msk'] },
  { display: 'MQ', legacyAliases: ['Mq'] },
  { display: 'CloudTrail', legacyAliases: ['Cloudtrail'] },
  { display: 'CloudFormation', legacyAliases: ['Cloudformation'] },
  { display: 'QuickSight', legacyAliases: ['Quicksight'] },
  { display: 'DocumentDB', legacyAliases: ['Documentdb'] },
  { display: 'OpenSearch', legacyAliases: ['Opensearch', 'Opensearch Service'] },
  { display: 'HealthLake', legacyAliases: ['Healthlake'] },
  { display: 'HealthImaging', legacyAliases: ['Healthimaging'] },
  { display: 'IoT Device Management', legacyAliases: ['Iot Device Management'] },
  { display: 'IoT Core', legacyAliases: ['Iot Core'] },
  { display: 'SES', legacyAliases: ['Simple Email Service'] },
  { display: 'NICE DCV', legacyAliases: ['Nice Dcv'] },
  { display: 'AppStream 2.0', legacyAliases: ['Appstream 2 0'] },
  { display: 'RDS for SQL Server', legacyAliases: ['Rds For Sql Server'] },
  { display: 'FSx for NetApp ONTAP', legacyAliases: ['Fsx Netapp Ontap'] },
  { display: 'FSx for OpenZFS', legacyAliases: ['Fsx For Openzfs'] },
  { display: 'GovCloud (US)', legacyAliases: ['Govcloud Us'] },
  { display: 'SageMaker Studio', legacyAliases: ['Sagemaker Studio'] },
  { display: 'SageMaker JumpStart', legacyAliases: ['Sagemaker Jumpstart'] },
  { display: 'Elemental MediaConvert', legacyAliases: ['Elemental Mediaconvert'] },
  { display: 'IAM Identity Center', legacyAliases: ['Iam Identity Center'] },
  { display: 'Managed Grafana', legacyAliases: ['Managed Service For Grafana'] },
  {
    display: 'Managed Service for Apache Flink',
    legacyAliases: ['Managed Service For Apache Flink'],
  },
]

/**
 * 収集時の一次正規化マップ（productId → 表示名）を構築する
 * collector.ts の旧 SERVICE_NAME_MAP に相当
 */
export function buildProductIdMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const service of SERVICES) {
    for (const id of service.productIds ?? []) {
      map[id] = service.display
    }
  }
  return map
}

/**
 * 表示時の二次正規化マップ（表記揺れ → 公式表記）を構築する
 * category-normalizer.ts の旧 DISPLAY_NAME_MAP に相当
 */
export function buildDisplayAliasMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const service of SERVICES) {
    for (const alias of service.legacyAliases ?? []) {
      map[alias] = service.display
    }
  }
  return map
}
