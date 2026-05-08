/**
 * カテゴリ正規化のポリシー
 *
 * 過去データには collector.ts の SERVICE_NAME_MAP 漏れによる表記揺れがあります
 * （例: "Ec2" "Sagemaker Studio" "Iot Device Management"）。
 * このファイルは「タグページを作る時点」での二次正規化を担当します。
 *
 * このファイルは編集して構いません — 新しいAWSサービスや表記揺れに気付いたら
 * DISPLAY_NAME_MAP / ROLLUP_MAP / EXCLUDED_CATEGORIES を更新してください。
 */

/**
 * 表示名の正規化（同一サービスの表記揺れを統一）
 * 過去データの「Title Case化された名前」→「公式表記」へのマップ
 */
const DISPLAY_NAME_MAP: Record<string, string> = {
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

/**
 * カテゴリページから除外する名前（サービスではない/価値の低いタグ）
 */
const EXCLUDED_CATEGORIES = new Set<string>(['General', 'Advance Pay'])

/**
 * タグページ生成の最小記事数（これ未満のサービスはページを作らない）
 * 1にすると全カテゴリにページができる。SEO/UX的にはある程度集まってからの方が良い。
 */
export const MIN_ARTICLES_FOR_PAGE = 2

export interface NormalizedCategory {
  /** 表示用の正式名（例: "EC2", "SageMaker"） */
  display: string
  /** URLスラグ（例: "ec2", "sagemaker"） */
  slug: string
}

/**
 * 元データのカテゴリ名を正規化された形に変換
 * @param raw - Markdownから抽出した生のカテゴリ名（例: "Ec2", "Sagemaker"）
 * @returns 正規化済みの表示名 + URLスラグ。除外対象の場合は null
 */
export function normalizeCategory(raw: string): NormalizedCategory | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (EXCLUDED_CATEGORIES.has(trimmed)) return null

  const display = DISPLAY_NAME_MAP[trimmed] ?? trimmed
  const slug = toSlug(display)
  return { display, slug }
}

/**
 * 表示名をURLスラグに変換
 * "API Gateway" → "api-gateway"
 * "FSx for NetApp ONTAP" → "fsx-for-netapp-ontap"
 * "AppStream 2.0" → "appstream-2-0"
 */
export function toSlug(display: string): string {
  return display
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * AI概要から1行説明を抽出（カード表示用）
 *
 * 戦略:
 * 1. 改行を空白に置換
 * 2. 最初の句点（。/.）で区切る
 * 3. それでも長い場合は MAX_LENGTH で切り詰めて末尾に "…"
 *
 * @param overview - summary.overview の文字列
 * @returns 1行の短い説明（空入力なら空文字）
 */
export function extractOneLineSummary(overview: string, maxLength = 120): string {
  if (!overview) return ''

  const flat = overview.replace(/\s+/g, ' ').trim()
  if (!flat) return ''

  const sentenceEnd = flat.search(/[。.!?！？]/)
  let firstSentence = sentenceEnd >= 0 ? flat.slice(0, sentenceEnd + 1) : flat

  if (firstSentence.length > maxLength) {
    firstSentence = `${firstSentence.slice(0, maxLength - 1)}…`
  }
  return firstSentence
}
