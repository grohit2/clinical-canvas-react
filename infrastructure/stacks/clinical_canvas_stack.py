from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    aws_dynamodb as dynamodb,
    aws_lambda as _lambda,
    aws_apigateway as apigateway,
    aws_iam as iam,
    aws_logs as logs,
    CfnOutput
)
from constructs import Construct
import os


class ClinicalCanvasStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # DynamoDB table with single-table design
        self.table = dynamodb.Table(
            self, "ClinicalCanvasTable",
            table_name="clinical-canvas",
            partition_key=dynamodb.Attribute(
                name="PK",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="SK", 
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,  # Change to RETAIN for production
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )

        # Add Global Secondary Indexes
        # GSI-1: AssigneeDue - for "my tasks" queries
        self.table.add_global_secondary_index(
            index_name="AssigneeDue",
            partition_key=dynamodb.Attribute(
                name="GSI1PK",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="GSI1SK",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # GSI-2: RoleName - for staff directory
        self.table.add_global_secondary_index(
            index_name="RoleName",
            partition_key=dynamodb.Attribute(
                name="GSI2PK",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="GSI2SK",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # GSI-3: PathwayState - for ward/theatre dashboards
        self.table.add_global_secondary_index(
            index_name="PathwayState",
            partition_key=dynamodb.Attribute(
                name="GSI3PK",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="GSI3SK",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # GSI-4: EntityTS - for site-wide feeds (optional)
        self.table.add_global_secondary_index(
            index_name="EntityTS",
            partition_key=dynamodb.Attribute(
                name="GSI4PK",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="GSI4SK",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # GSI-5: Unread - for update ring counts (optional)
        self.table.add_global_secondary_index(
            index_name="Unread",
            partition_key=dynamodb.Attribute(
                name="GSI5PK",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="GSI5SK",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # Lambda function for the API
        self.api_lambda = _lambda.Function(
            self, "ClinicalCanvasApiLambda",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="app.main.handler",
            code=_lambda.Code.from_asset("../backend"),
            timeout=Duration.seconds(30),
            memory_size=512,
            environment={
                "DYNAMODB_TABLE_NAME": self.table.table_name,
                "AWS_REGION": self.region,
                "JWT_SECRET_KEY": "your-secret-key-change-in-production-use-secrets-manager"
            },
            log_group=logs.LogGroup(
                self, "ClinicalCanvasApiLogGroup",
                log_group_name="/aws/lambda/clinical-canvas-api",
                retention=logs.RetentionDays.ONE_WEEK,
                removal_policy=RemovalPolicy.DESTROY
            )
        )

        # Grant DynamoDB permissions to Lambda
        self.table.grant_read_write_data(self.api_lambda)

        # API Gateway
        self.api = apigateway.LambdaRestApi(
            self, "ClinicalCanvasApi",
            handler=self.api_lambda,
            proxy=True,
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=apigateway.Cors.ALL_ORIGINS,
                allow_methods=apigateway.Cors.ALL_METHODS,
                allow_headers=["*"],
                allow_credentials=True
            ),
            description="Clinical Canvas patient management API",
            deploy_options=apigateway.StageOptions(
                stage_name="prod",
                throttling_rate_limit=1000,
                throttling_burst_limit=2000,
                logging_level=apigateway.MethodLoggingLevel.INFO,
                data_trace_enabled=True
            )
        )

        # Lambda function for database initialization/seeding
        self.init_lambda = _lambda.Function(
            self, "ClinicalCanvasInitLambda",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="init_db.handler",
            code=_lambda.Code.from_asset("../backend"),
            timeout=Duration.seconds(60),
            memory_size=256,
            environment={
                "DYNAMODB_TABLE_NAME": self.table.table_name,
                "AWS_REGION": self.region
            }
        )

        # Grant DynamoDB permissions to init Lambda
        self.table.grant_read_write_data(self.init_lambda)

        # Outputs
        CfnOutput(
            self, "ApiUrl",
            value=self.api.url,
            description="API Gateway URL"
        )

        CfnOutput(
            self, "DynamoDBTableName",
            value=self.table.table_name,
            description="DynamoDB table name"
        )

        CfnOutput(
            self, "ApiLambdaFunctionName",
            value=self.api_lambda.function_name,
            description="API Lambda function name"
        )

        CfnOutput(
            self, "InitLambdaFunctionName",
            value=self.init_lambda.function_name,
            description="Database initialization Lambda function name"
        )