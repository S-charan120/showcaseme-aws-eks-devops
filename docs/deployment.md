# AWS EKS deployment runbook

This is an operator-run deployment. Terraform, GitLab CI, Helm and Argo CD are committed here, but no cloud resources are created by a Git push. Run the commands from the repository root unless a step explicitly changes directory.

## 0. Cost and account preparation

Use a dedicated AWS sandbox account. Configure an AWS Budget and billing alerts first. The default design creates an EKS control plane, EC2 managed node group, NAT Gateway, RDS PostgreSQL, ECR, S3, Secrets Manager and (after ingress) an ALB. These resources incur ongoing charges. Review [cost controls](costs.md) and the defaults in `infra/terraform/variables.tf` before applying.

## 1. Terraform state, configuration and plan

Use Terraform 1.6+ and AWS CLI. The sample has no remote backend configured by default. For shared/team use, configure encrypted remote state with versioning and locking before provisioning. Terraform state contains generated database/JWT secret material; treat state and plan files as sensitive. Never commit state, plans or real tfvars.

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit aws_region, project_name/environment, cluster_admin_cidrs and sizing as needed.
# Replace the safe 127.0.0.1/32 cluster_admin_cidrs default with your own public IPv4 /32.
terraform fmt -check -recursive
terraform init
terraform validate
terraform plan -out=tfplan
terraform show tfplan
```

Review subnet CIDRs, region, EKS version, instance types, node capacity, RDS class, backup retention, NAT topology and every billable resource. Only after reviewing the plan should you run:

```bash
terraform apply tfplan
cd ../..
```

Terraform organizes resources across `main.tf`, `network.tf`, `eks.tf`, `iam.tf`, `database.tf` and `storage-ecr.tf`. These files remain in the same root module; resource addresses have not been renamed.

## 2. Connect to EKS

From the repository root, derive cluster details from Terraform outputs rather than assuming a region or cluster name:

```bash
TF_DIR=infra/terraform
AWS_REGION="$(terraform -chdir="$TF_DIR" output -raw aws_region)"
CLUSTER_NAME="$(terraform -chdir="$TF_DIR" output -raw cluster_name)"
VPC_ID="$(terraform -chdir="$TF_DIR" output -raw vpc_id)"
aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME"
kubectl get nodes -o wide
```

The default `cluster_admin_cidrs` value is `127.0.0.1/32` as a safe placeholder. Replace it with the operator's current public IPv4 /32 before Terraform apply; otherwise kubectl from your workstation will not reach the public EKS API endpoint.

## 3. Create the Kubernetes runtime Secret

Terraform creates an RDS database and a Secrets Manager JSON secret containing its endpoint, username, generated password and URL-encoded `database_url`. It also creates a separate JWT secret. The manifests expect a Kubernetes Secret named `showcaseme-runtime`; this repository does not install an automatic Secrets Manager synchronization controller.

Run from the repository root after Terraform apply:

```bash
TF_DIR=infra/terraform
DB_SECRET_ARN="$(terraform -chdir="$TF_DIR" output -raw database_secret_arn)"
JWT_SECRET_ARN="$(terraform -chdir="$TF_DIR" output -raw jwt_secret_arn)"
DB_JSON="$(aws secretsmanager get-secret-value --secret-id "$DB_SECRET_ARN" --query SecretString --output text)"
DATABASE_URL="$(printf '%s' "$DB_JSON" | jq -r '.database_url')"
JWT_SECRET="$(aws secretsmanager get-secret-value --secret-id "$JWT_SECRET_ARN" --query SecretString --output text)"

kubectl create namespace showcaseme --dry-run=client -o yaml | kubectl apply -f -
kubectl -n showcaseme create secret generic showcaseme-runtime \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

unset DB_JSON DATABASE_URL JWT_SECRET DB_SECRET_ARN JWT_SECRET_ARN
```

Do not print or commit the secret values. Restrict access to this namespace Secret. Kubernetes Secrets are base64-encoded; for production, configure EKS envelope encryption/KMS and restrictive RBAC. Rotation requires updating both Secrets Manager and the Kubernetes Secret, then restarting the API Deployment.

## 4. Install platform controllers

Install Argo CD following the [official installation guide](https://argo-cd.readthedocs.io/en/stable/getting_started/). The Argo CD Application CRs are namespaced in `argocd`, so create the namespace and install Argo CD before applying them:

```bash
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f deploy/argocd/metrics-server.yaml
```

Install the AWS Load Balancer Controller CRDs and controller following the official AWS instructions for a version compatible with the selected EKS Kubernetes version. Terraform creates its IRSA role. Install the controller using Terraform outputs:

```bash
TF_DIR=infra/terraform
AWS_REGION="$(terraform -chdir="$TF_DIR" output -raw aws_region)"
CLUSTER_NAME="$(terraform -chdir="$TF_DIR" output -raw cluster_name)"
VPC_ID="$(terraform -chdir="$TF_DIR" output -raw vpc_id)"
ALB_CONTROLLER_ROLE_ARN="$(terraform -chdir="$TF_DIR" output -raw alb_controller_role_arn)"

helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system --create-namespace \
  --set clusterName="$CLUSTER_NAME" \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn="$ALB_CONTROLLER_ROLE_ARN" \
  --set region="$AWS_REGION" \
  --set vpcId="$VPC_ID"
```

Before applying the Cluster Autoscaler Application, substitute the cluster name, AWS region and IRSA role generated by Terraform:

```bash
TF_DIR=infra/terraform
CLUSTER_AUTOSCALER_ROLE_ARN="$(terraform -chdir="$TF_DIR" output -raw cluster_autoscaler_role_arn)"
sed -i "s|showcaseme-dev|$CLUSTER_NAME|g" deploy/argocd/cluster-autoscaler.yaml
sed -i "s|ap-south-1|$AWS_REGION|g" deploy/argocd/cluster-autoscaler.yaml
sed -i "s|REPLACE_WITH_TERRAFORM_CLUSTER_AUTOSCALER_ROLE_ARN|$CLUSTER_AUTOSCALER_ROLE_ARN|g" deploy/argocd/cluster-autoscaler.yaml
kubectl apply -f deploy/argocd/cluster-autoscaler.yaml
```

The checked-in Cluster Autoscaler chart version is configured for the Kubernetes minor version documented in the manifest. Keep its version aligned with `cluster_version` in Terraform and review the upstream compatibility notes when changing either.

## 5. Configure GitLab CI and ECR

Import or mirror this GitHub repository into a GitLab project at the path configured by Terraform `gitlab_project_path` (default: `S-charan120/showcaseme-aws-eks-devops`). GitLab's `.gitlab-ci.yml` is the deployment pipeline. Set these protected/masked GitLab CI/CD variables:

- `AWS_ROLE_ARN`: Terraform output `gitlab_ci_role_arn`.
- `AWS_REGION`: Terraform output `aws_region`.
- `ECR_API_REPOSITORY`: Terraform output `ecr_api_repository_url`.
- `ECR_WEB_REPOSITORY`: Terraform output `ecr_web_repository_url`.
- `GITOPS_PUSH_TOKEN`: GitLab project access token with `write_repository` scope, used only to commit Helm image tags.

The pipeline requests a GitLab OIDC ID token with audience `sts.amazonaws.com`. Terraform trust is scoped to the configured project path and default branch. Do not create long-lived AWS access keys. The ECR repository variables must contain full repository URLs, including registry/account and repository name.

Before AWS authentication or ECR access, the publish job requires `GITOPS_PUSH_TOKEN`. If it is missing, the publish job fails before building or pushing images; this prevents a green pipeline with unpublished GitOps desired state. With the token present, the default-branch pipeline validates, builds API/web images and publishes `sha-$CI_COMMIT_SHA` tags to ECR. Publishing is serialized and checks for an existing immutable image tag before pushing. The promotion job is also serialized and first compares its pipeline SHA with the freshly fetched default-branch HEAD; stale pipelines exit successfully without changing GitOps desired state. It writes the same SHA tag to both image entries in `deploy/helm/showcaseme/values-aws.yaml`. Configure the GitLab push mirror back to GitHub only if you want GitOps promotion commits to appear in the public GitHub copy. Argo CD reads GitLab directly.

## 6. Configure AWS Helm values

Edit `deploy/helm/showcaseme/values-aws.yaml` before the first application sync. Replace these placeholders using Terraform outputs:

- `api.image.repository` and `web.image.repository`: `ecr_api_repository_url` and `ecr_web_repository_url`.
- `api.serviceAccount.annotations.eks.amazonaws.com/role-arn`: `app_irsa_role_arn`.
- `api.env[].name: AWS_REGION`: `aws_region`.
- `api.env[].name: S3_BUCKET`: `s3_assets_bucket`.
- `ingress.annotations.alb.ingress.kubernetes.io/certificate-arn`: an ACM certificate ARN in the same region as the ALB.
- `ingress.host`: a DNS name you control, after its record points to the ALB.

The image tags begin as `bootstrap` placeholders. The first eligible GitLab default-branch pipeline publishes the commit-SHA images and promotes both tags. Confirm the GitOps commit and that both ECR tags exist before the first Argo CD application sync. The AWS values use an HTTPS-only ALB listener and HTTP-to-HTTPS redirect; an ACM certificate ARN is required. Do not expose the application publicly until certificate and DNS prerequisites are satisfied.

The chart defaults to HPA-managed API/web replicas; in that mode Deployments omit `spec.replicas`. With autoscaling disabled, `api.replicaCount` and `web.replicaCount` set fixed replicas. GitHub Actions renders and validates both modes.

## 7. Apply the Argo CD application

The Application points to the GitLab repository `S-charan120/showcaseme-aws-eks-devops.git`, branch `main`, and chart path `deploy/helm/showcaseme`, using `values-aws.yaml`. If you use a different GitLab namespace/project, update both the Terraform `gitlab_project_path` value and `deploy/argocd/application.yaml`. Configure Argo CD repository credentials if the GitLab project is private.

```bash
kubectl apply -f deploy/argocd/application.yaml
kubectl get applications -n argocd
kubectl get hpa -n showcaseme
kubectl get ingress -n showcaseme
```

Argo CD is the application deployment controller. Do not use `kubectl apply` or `helm upgrade` to make lasting changes to application resources; change Helm values in Git and allow Argo CD to reconcile.

## 8. Verify application, data and access

- API: `kubectl -n showcaseme get pods`; inspect logs and confirm successful PostgreSQL migrations/readiness.
- Web/API routing: browse the ALB DNS name; the ALB routes to the web Service and Nginx proxies `/api/*` to the internal API Service.
- RDS: verify private connectivity from the API workload; external database connections should be blocked.
- S3: request a signed upload URL, upload an asset and verify the bucket remains private.
- IRSA: inspect the API ServiceAccount annotation and confirm object access is limited to `portfolio-assets/*`.
- HPA: `kubectl get hpa -n showcaseme`; metrics-server must be healthy.
- Cluster Autoscaler: inspect controller logs and perform a controlled scale-out test only after verifying IAM permissions and node-group limits.

## 9. Teardown

Delete Argo CD applications/workloads first. Review `terraform plan -destroy` and destroy the sandbox only after backing up or intentionally discarding data. Confirm EKS, RDS, NAT Gateway, ALB, EIPs and other billable resources are removed. Review S3 objects, volumes, snapshots, log groups and Secrets Manager recovery windows separately.
