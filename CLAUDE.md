@AGENTS.md

# Home Service Platform

## 项目概述
家装/维修类服务市场 + 工程执行管理系统
核心目标：将"需求线索 → 评估 → 转化工程 → 分配施工方 → 执行 → 收款"全流程数字化闭环管理

## 技术栈
- Next.js 16.2.4（App Router，React Server Components + Server Actions）
- React 19.2.4
- TypeScript 5
- Supabase（@supabase/ssr + @supabase/supabase-js）— 用户认证 + PostgreSQL
- Prisma 6 — ORM，管理业务数据
- Tailwind CSS 4
- shadcn/ui（基于 Radix/Base UI）
- @base-ui/react
- lucide-react
- class-variance-authority + clsx + tailwind-merge

## 架构特点
- 双客户端模式：Supabase server client（SSR）+ browser client（客户端组件）
- httpOnly cookie 存储 user-role，用于中间件鉴权
- src/proxy.ts 实现路由保护

## 用户角色（5个）
- CONTRACTOR：施工公司用户，自助注册 → 填写资料 → 等待审批 → 接单
- ADMIN：平台管理员，审批Contractor，管理用户，邀请内部用户
- SALES：销售，管理CRM和Lead（由Admin邀请）
- MARKETING：市场，Lead流转（由Admin邀请）
- DATA_COLLECTOR：外勤，采集Lead（由Admin邀请）

## 数据模型
User → ContractorCompany → Contractor → Job ← Lead → Deal
主要模型：User / ContractorCompany / Contractor / Lead / Job / Deal

User 新增字段：firstName, lastName
ContractorCompany 新增字段：businessNumber, address, website, wsibNumber, insuranceNumber,
  contactName, contactTitle, contactEmail, contactPhone, termsAccepted, termsAcceptedAt, adminNote

## ContractorCompany 状态流转
UNVERIFIED_PROFILE → (填写资料提交) → PENDING_APPROVAL → (Admin审批) → ACTIVE
                                                         → REJECTED
                                                         → ACTION_REQUIRED → (修改资料) → PENDING_APPROVAL

## 路由结构
- /login：统一登录页
- /register：Contractor 注册（Step 1：账号创建）
- /register/business-profile：填写 Business Profile（Step 2）
- /register/pending：等待审批页面
- /forgot-password：忘记密码
- /reset-password：重置密码
- /accept-invite：接受邀请（内部用户 SALES/MARKETING/DATA_COLLECTOR）
- /set-password：设置密码（接受邀请后）
- /admin/*：平台管理后台
- /contractor/*：施工方工作台（只有 ACTIVE 状态才能进入）
- /sales/*：销售后台
- /marketing/*：市场后台
- /collector/*：外勤采集

## Contractor 注册流程
1. /register → 填写 First Name(可选), Last Name(可选), Email, Password
   → 创建 Supabase 用户 + Prisma User(role=CONTRACTOR) + ContractorCompany(status=UNVERIFIED_PROFILE)
   → 设置 user-role cookie → 跳转 /register/business-profile
2. /register/business-profile → 填写 Business Info + Person in Charge + Insurance & Compliance + 勾选 T&C
   → 更新 ContractorCompany (status=PENDING_APPROVAL) → 跳转 /register/pending
3. /register/pending → 显示审核中提示，可退出登录

## Contractor 登录后路由（根据公司状态）
- UNVERIFIED_PROFILE → /register/business-profile
- PENDING_APPROVAL → /register/pending
- ACTION_REQUIRED → /register/business-profile
- REJECTED → 登录页错误提示
- ACTIVE → /contractor/overview

## 内部用户邀请流程
Admin 在 /admin/users 页面，通过 Invite User 弹窗填写邮箱和角色（SALES/MARKETING/DATA_COLLECTOR）
→ Supabase inviteUserByEmail → 用户点击邮件链接 → /accept-invite → /set-password → 跳转对应 Dashboard

## Admin 审批功能（/admin/contractors）
显示 PENDING_APPROVAL + ACTION_REQUIRED 状态的 Contractor，展示完整 Business Profile：
- Approve → ACTIVE
- Request More Info → ACTION_REQUIRED（弹窗填写需要补充的内容）
- Reject → REJECTED（弹窗填写拒绝原因，存为 adminNote）

## LeadStatus 状态流转
NEW_LEAD / SUBMITTED → (评估) → BACKED → (注入) → INJECTED → (执行) → JOB_ACTIVE
                               → URGENT → (注入/回退)
                               → PARKED → (恢复) → BACKED
                               → SCHEDULED

## 已完成模块
- 数据库 Schema
- Contractor 注册（两步流程）/ 登录 / 状态路由
- 内部用户邀请（Admin → SALES/MARKETING/DATA_COLLECTOR）
- 忘记密码 / 重置密码
- 接受邀请 / 设置密码
- Admin Dashboard（Contractor审批完整资料展示、三按钮操作）
- Admin 用户管理（邀请内部用户）
- Contractor Dashboard（Overview, Jobs）
- 统一密码规则（8位+大小写+数字+特殊字符）
- Data Collector 模块（/collector/dashboard, /collector/leads, /collector/leads/new, /collector/leads/[id]）
  - Google Maps 地图选点 + 反向地理编码
  - 语音转文字（Web Speech API）
  - 彩色分区表单（Location/Photos/Phase/Demand+Contacts/Supply/Field Notes）
- Admin Evaluation & Sorting（/admin/evaluation）
  - 统计卡片、Phase 过滤、Action Queue（URGENT）、双列 Backed/New Leads 布局
  - Server actions: backLead, markLeadUrgent, injectLead, parkLead, delayLead
- Admin Parking（/admin/parking）
  - 注入队列 + 横向 Phase 看板（PARKED leads 按 phase 分组）
- Admin Lead Detail（/admin/leads/[id]）
  - SALES 角色可访问 /admin/evaluation, /admin/parking, /admin/leads/*

## 开发规范
- 所有 UI 文字使用英文
- 使用 shadcn/ui 组件
- 权限严格按照用户 Role 控制
- 数据隔离：Contractor 只能看到本公司数据
- 新功能开发完成后及时 git commit
- Prisma enum 在旧生成客户端中需要 `as never` 或 `as string` 转型，待 prisma db push 后自动修复
