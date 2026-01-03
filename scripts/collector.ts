import Parser from 'rss-parser'
import type { AWSWhatsNewItem } from './types.js'

const RSS_URL = 'https://aws.amazon.com/about-aws/whats-new/recent/feed/'

// AWSサービス名のマッピング（プロダクトID → 表示名）
const SERVICE_NAME_MAP: Record<string, string> = {
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

/**
 * 24時間以内に公開された記事かどうかを判定
 * @param pubDate - 公開日時
 * @param now - 現在日時（テスト用に指定可能）
 * @returns 24時間以内ならtrue
 */
export function isWithin24Hours(pubDate: Date, now: Date = new Date()): boolean {
  const hoursDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60)
  return hoursDiff >= 0 && hoursDiff <= 24
}

/**
 * カテゴリ文字列からサービス名のリストを抽出
 * RSSフィードのカテゴリは "general:products/ec2" のような形式
 * @param categories - RSSアイテムのカテゴリ配列
 * @returns サービス名のリスト（例: ["EC2", "Compute"]）
 */
export function extractServiceNames(categories: string[]): string[] {
  if (categories.length === 0) {
    return ['General']
  }

  const serviceNames = new Set<string>()

  for (const category of categories) {
    // "general:products/ec2" → "ec2" を抽出
    const match = category.match(/general:products\/(.+)/)
    if (match) {
      const productId = match[1].toLowerCase()
      const serviceName = SERVICE_NAME_MAP[productId]
      if (serviceName) {
        serviceNames.add(serviceName)
      } else {
        // マッピングにない場合は、ハイフンを除去してタイトルケースに変換
        const formattedName = productId
          .split('-')
          .filter((part) => part !== 'amazon' && part !== 'aws')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
        if (formattedName) {
          serviceNames.add(formattedName)
        }
      }
    }
  }

  // サービス名が抽出できなかった場合は "General" を返す
  if (serviceNames.size === 0) {
    return ['General']
  }

  return Array.from(serviceNames)
}

/**
 * RSS Parserのアイテムを内部形式に変換
 * @param rssItem - RSS Parserから取得した生データ
 * @returns AWSWhatsNewItem
 */
export function convertRssItem(rssItem: {
  title?: string
  link?: string
  pubDate?: string
  content?: string
  categories?: string[]
  guid?: string
}): AWSWhatsNewItem {
  // 必須フィールドのバリデーション
  if (!rssItem.title) {
    throw new Error('RSS item is missing required field: title')
  }
  if (!rssItem.link) {
    throw new Error('RSS item is missing required field: link')
  }
  if (!rssItem.guid) {
    throw new Error('RSS item is missing required field: guid')
  }

  // 日付のパースとバリデーション
  let pubDate: Date
  if (rssItem.pubDate) {
    pubDate = new Date(rssItem.pubDate)
    if (Number.isNaN(pubDate.getTime())) {
      throw new Error(`Invalid date format: ${rssItem.pubDate}`)
    }
  } else {
    pubDate = new Date()
  }

  // カテゴリからサービス名を抽出
  const categories = extractServiceNames(rssItem.categories || [])

  return {
    title: rssItem.title,
    link: rssItem.link,
    pubDate,
    content: rssItem.content || '',
    categories,
    guid: rssItem.guid,
  }
}

/**
 * AWS What's New RSSフィードから記事を取得
 * @param feedUrl - RSSフィードのURL（テスト用に指定可能）
 * @returns AWSWhatsNewItem[]
 */
export async function fetchRssFeed(feedUrl: string = RSS_URL): Promise<AWSWhatsNewItem[]> {
  const parser = new Parser()
  const feed = await parser.parseURL(feedUrl)

  const items: AWSWhatsNewItem[] = []

  for (const item of feed.items) {
    try {
      const converted = convertRssItem({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        content: item.content || item.contentSnippet,
        categories: item.categories,
        guid: item.guid || item.link,
      })
      items.push(converted)
    } catch (error) {
      console.warn(`Skipping invalid RSS item: ${error}`)
    }
  }

  return items
}

/**
 * 過去24時間以内に公開された記事のみをフィルタリング
 * @param items - 全記事リスト
 * @param now - 現在日時（テスト用に指定可能）
 * @returns 24時間以内の記事のみ
 */
export function filterRecentItems(
  items: AWSWhatsNewItem[],
  now: Date = new Date(),
): AWSWhatsNewItem[] {
  return items.filter((item) => isWithin24Hours(item.pubDate, now))
}

/**
 * 最新のAWS What's New記事を収集
 * @param now - 現在日時（テスト用に指定可能）
 * @returns 24時間以内の新規記事
 */
export async function collectRecentItems(now: Date = new Date()): Promise<AWSWhatsNewItem[]> {
  const allItems = await fetchRssFeed()
  const recentItems = filterRecentItems(allItems, now)

  console.log(`Fetched ${allItems.length} items, ${recentItems.length} within last 24 hours`)

  return recentItems
}
