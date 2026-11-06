# AWS deployment plan

1. Configure AWS CLI and billing budget; choose a region.
2. Configure encrypted remote Terraform state and access controls.
3. Review Terraform modules, cost and security; run `terraform fmt -check`, `init`, `validate`, and `plan`.
4. Provision VPC/EKS/RDS/S3 and IAM only after approval.
5. Configure GitLab OIDC/federated access or scoped temporary credentials; never store AWS access keys in repository variables.
6. Build/push immutable SHA images to ECR; update GitOps chart values.
7. Install/configure Argo CD and sync Helm release; verify rollout, probes, HPA and logs.
8. Verify private RDS connectivity, IRSA access to S3 and public portfolio publishing.
9. Capture release timing with consistent start/end points; do not report 12-to-8 minutes absent evidence.
10. Destroy sandbox resources when finished and confirm no billable leftovers.
