import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { App, Stack } from 'aws-cdk-lib';
import * as integ from '@aws-cdk/integ-tests-alpha';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { BlueGreenDeploymentFailureBehavior, BlueGreenDeploymentLifecycleHook } from 'aws-cdk-lib/aws-ecs';

const app = new App();
const stack = new Stack(app, 'aws-ecs-integ-fargate-blue-green');

const vpc = new ec2.Vpc(stack, 'Vpc', { maxAzs: 2, restrictDefaultSecurityGroup: false });
const cluster = new ecs.Cluster(stack, 'Cluster', { vpc });

const taskDefinition = new ecs.FargateTaskDefinition(stack, 'TaskDef', {
  memoryLimitMiB: 1024,
  cpu: 512,
});
taskDefinition.addContainer('web', {
  image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
  portMappings: [{ containerPort: 80 }],
});

const service = new ecs.FargateService(stack, 'Service', {
  cluster,
  taskDefinition,
  blueGreenDeploymentConfiguration: {
    lifecycleHooks: [
      {
        hookType: BlueGreenDeploymentLifecycleHook.BEFORE_INSTALL,
        functionArn: 'arn:aws:lambda:us-west-2:123456789012:function:BeforeInstall',
      },
    ],
    deploymentFailureBehavior: BlueGreenDeploymentFailureBehavior.ROLLBACK,
  },
});

const lb = new elbv2.ApplicationLoadBalancer(stack, 'LB', { vpc, internetFacing: true });
const listener = lb.addListener('Listener', { port: 80 });
listener.addTargets('Target', {
  port: 80,
  targets: [service],
});

new integ.IntegTest(app, 'IntegFargateServiceBlueGreen', {
  testCases: [stack],
});

app.synth();
