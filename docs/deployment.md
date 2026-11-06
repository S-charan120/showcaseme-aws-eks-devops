# AWS EKS deployment runbook

This is an operator-run deployment. Terraform, GitLab CI, Helm and Argo CD are committed here, but no cloud resources are created by a Git push.

## 0. Cost and account preparation
Use a dedicated AWS sandbox account. Configure an AWS Budget and billing alerts first. The default design creates an EKS control plane, EC2 node group, NAT Gateway, RDS PostgreSQL, ECR, S3, Secrets Manager and (after ingress) an ALB. Several resources bill continuously. Review [cost controls](costs.md). Do not apply until you have reviewed the full plan.

## 1. Terraform state and access
Use Terraform 1.6+ and AWS CLI. Configure an encrypted remote state backend with tightly restricted access before team use. State contains generated database and JWT secrets. Never commit state, plans, or real tfvars.

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit cluster_admin_cidrs to your own current public IPv4 address /32.
terraform fmt -recursive
terraform init
terraform validate
terraform plan -out=tfplan
terraform show tfplan
```

Review subnet CIDRs, region, instance type, cluster version, DB class, NAT design and every billable resource. Only then run `terraform apply tfplan`.

## 2. Configure runtime secrets safely
Terraform creates a Secrets Manager JSON secret containing the RDS endpoint, username, generated password and a URL-encoded `database_url`, plus a separate randomly generated JWT secret.

After creating the namespace, retrieve the secrets in a shell without printing values to the terminal and create the Kubernetes Secret expected by Helm:

```bash
kubectl create namespace showcaseme --dry-run=client -o yaml | kubectl apply -f -

DB_SECRET_ARN="$(terraform output -raw database_secret_arn)"
JWT_SECRET_ARN="$(terraform output -raw jwt_secret_arn)"
DB_JSON="$(aws secretsmanager get-secret-value --secret-id "$DB_SECRET_ARN" --query SecretString --output text)"
DATABASE_URL="$(printf '%s' "$DB_JSON" | jq -r '.database_url')"
JWT_SECRET="$(aws secretsmanager get-secret-value --secret-id "$JWT_SECRET_ARN" --query SecretString --output text)"

kubectl -n showcaseme create secret generic showcaseme-runtime \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

unset DB_JSON DATABASE_URL JWT_SECRET DB_SECRET_ARN JWT_SECRET_ARN
```

Restrict access to this namespace Secret. Kubernetes Secrets are base64-encoded, not encrypted by default; enable EKS envelope encryption / KMS and RBAC controls in a production account. Secret rotation must update both Secrets Manager and the Kubernetes Secret, then restart the API deployment.

## 3. Connect to the cluster
Use Terraform outputs to configure kubeconfig:

```bash
aws eks update-kubeconfig --region "$(terraform output -raw aws_region 2>/dev/null || echo ap-south-1)" --name "$(terraform output -raw cluster_name)"
kubectl get nodes -o wide
```

Replace the sample `cluster_admin_cidrs` with the public IP /32 of the person running kubectl before apply. The default 127.0.0.1/32 intentionally prevents general internet API access.

## 4. Install Argo CD and AWS Load Balancer Controller
Install Argo CD using its official installation guidance. Then create the Load Balancer Controller service account with the Terraform output `alb_controller_role_arn`. Use the output `vpc_id`, cluster name and selected region:

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system --create-namespace \
  --set clusterName="$(terraform output -raw cluster_name)" \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn="$(terraform output -raw alb_controller_role_arn)" \
  --set region=ap-south-1 \
  --set vpcId="$(terraform output -raw vpc_id)"
```

Install the controller CRDs using the official AWS Load Balancer Controller instructions for its selected release. Verify controller pods and IAM permissions before applying the Ingress.

## 5. Configure GitLab CI and ECR
Import or mirror this GitHub repository into GitLab at the project path set in `gitlab_project_path` (default `S-charan120/showcaseme-aws-eks-devops`). The GitLab project's `.gitlab-ci.yml` is the resume-aligned delivery pipeline.

Set protected/masked CI variables:
- `AWS_ROLE_ARN`: Terraform output `gitlab_ci_role_arn`.
- `AWS_REGION`: Terraform region.
- `GITOPS_PUSH_TOKEN`: GitLab project access token with `write_repository` scope, used only for committing Helm image tags (not for AWS access).

The pipeline uses an OIDC ID token with audience `sts.amazonaws.com`. Terraform trust is restricted to the configured GitLab project and default branch. Do not create long-lived AWS access keys.

The first main-branch run validates code, builds API/web images, publishes SHA-tagged images to ECR, then commits those immutable image tags to `deploy/helm/showcaseme/values-aws.yaml`. Configure the GitLab push mirror to GitHub if you want these GitOps promotion commits reflected on the public GitHub repository. Ensure protected-branch settings permit the approved CI identity or change promotion to a merge-request workflow.

## 6. Update AWS Helm values
Update `deploy/helm/showcaseme/values-aws.yaml` placeholders with:
- ECR API and web repository URLs from Terraform outputs.
- `app_irsa_role_arn`.
- `s3_assets_bucket`.
- A DNS host only after domain/HTTPS configuration is completed.

For initial testing, keep ingress host empty to use the ALB DNS address. The current sample ingress uses HTTP only. For a real domain, configure ACM certificate, HTTPS listener and HTTP-to-HTTPS redirect before using it for production.

## 7. Install autoscaling components and sync Argo CD
Apply the Argo CD Application manifests in `deploy/argocd`. Before applying `cluster-autoscaler.yaml`, replace the role ARN and cluster name using Terraform outputs. The configured chart is compatible with Kubernetes 1.35; keep Cluster Autoscaler minor version aligned with the cluster.

```bash
kubectl apply -f deploy/argocd/metrics-server.yaml
kubectl apply -f deploy/argocd/cluster-autoscaler.yaml
kubectl apply -f deploy/argocd/application.yaml
kubectl get applications -n argocd
kubectl get hpa -n showcaseme
```

Argo CD watches GitLab main and reconciles the Helm chart. Rollback is performed by reverting the image-tag commit in Git and allowing Argo CD to reconcile.

## 8. Verify application, data and access
- API readiness: `kubectl -n showcaseme get pods`; logs show successful PostgreSQL migration and API readiness.
- Public portfolio: register, create, edit, publish, open public URL, unpublish and delete a test portfolio.
- RDS: verify private network reachability only from the EKS workload; test that external connections are blocked.
- S3: request a signed upload URL, upload an image and verify access remains private.
- IRSA: inspect the API service account annotation and verify the application can write only to the allowed `portfolio-assets/*` key prefix.
- HPA: `kubectl get hpa -n showcaseme`; metrics-server must be healthy.
- Node autoscaler: inspect the Cluster Autoscaler logs and confirm scaling decisions only under a controlled test load.

## 9. Tear down
Delete Argo CD apps and the namespace workload first. Then review `terraform plan -destroy` and destroy the sandbox when data has been backed up or intentionally discarded. Confirm EKS, RDS, NAT Gateway, ALB, EIPs and other billable resources are gone.
