#!/usr/bin/env python3
import aws_cdk as cdk
from stacks.clinical_canvas_stack import ClinicalCanvasStack

app = cdk.App()

# Get environment variables
env = cdk.Environment(
    account=app.node.try_get_context("account"),
    region=app.node.try_get_context("region") or "us-east-1"
)

# Create the stack
ClinicalCanvasStack(
    app, 
    "ClinicalCanvasStack",
    env=env,
    description="Clinical Canvas patient management system infrastructure"
)

app.synth()