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
User → ContractorCompany → Job ← Lead → Deal
主要模型：User / ContractorCompany / Lead / LeadContact / Job / JobOffer / Deal / Zone

注意：已删除独立的 Contractor 模型，施工方统一用 ContractorCompany 表示。

Zone 字段：id, name, description, color, createdAt, updatedAt
  默认数据：North York Hub (#3b82f6), Downtown (#8b5cf6)

User 新增字段：zoneId（→Zone，仅 DATA_COLLECTOR 使用）

ContractorCompany 字段：name, status, businessNumber, address, website, tradeType,
  wsibNumber, insuranceNumber, contactName, contactTitle, contactEmail, contactPhone,
  termsAccepted, termsAcceptedAt, adminNote

Job 字段：leadId, phase, status(JobStatus), scope, priceType, priceFixed, priceMin,
  priceMax, timeline, serviceType, contractorType, companyId(→ContractorCompany), progressNote

JobOffer 字段：jobId, companyId(→ContractorCompany), status(pending/accepted/rejected), sentAt, respondedAt

Lead 新增字段：reviewComment, submittedAt, isUrgent, scheduledInjectAt,
  marketingTag, retryCount(@default(0)), nextFollowUpDate, marketingNote, sentimentTag,
  zoneId, zoneName

## ContractorCompany 状态流转
UNVERIFIED_PROFILE → (填写资料提交) → PENDING_APPROVAL → (Admin审批) → ACTIVE
                                                         → REJECTED
                                                         → ACTION_REQUIRED → (修改资料) → PENDING_APPROVAL

## JobStatus 枚举
PENDING → (Fill Details) → READY → (Send Offer) → OFFER_SENT → (Accept) → ASSIGNED
→ (Start) → IN_PROGRESS → (Complete) → COMPLETED → (Admin verify) → VERIFIED
CANCELLED（随时可取消）

## LeadStatus 状态流转
SUBMITTED → (评估) → NEW_LEAD / BACKED / URGENT / PARKED / SCHEDULED / NEEDS_FIX / RESUBMITTED
→ (Send to Marketing) → MARKETING_INBOX → (Accept) → TO_CONTACT → CONTACTING → NO_RESPONSE / CONTACT_ESTABLISHED
→ (Qualify) → QUALIFIED → JOB_ACTIVE

NEEDS_FIX 流转：Admin 标记 → 采集员修改 → 采集员 Resubmit → RESUBMITTED → Admin 重新评估
注意：injectLead 现在改为状态→MARKETING_INBOX，不再创建 Job。Job 创建移至 Sales Deal Won 后触发。

## 路由结构
- /login：统一登录页
- /register：Contractor 注册（Step 1：账号创建）
- /register/business-profile：填写 Business Profile（Step 2，含 tradeType 选择）
- /register/pending：等待审批页面
- /forgot-password：忘记密码
- /reset-password：重置密码
- /accept-invite：接受邀请（内部用户）
- /set-password：设置密码（接受邀请后）
- /admin/*：平台管理后台
- /contractor/*：施工方工作台（只有 ACTIVE 状态才能进入）
- /collector/*：外勤采集
- /marketing/*：市场工作台（MARKETING + ADMIN 可访问）

## Contractor 注册流程
1. /register → 填写 First Name(可选), Last Name(可选), Email, Password
   → 创建 Supabase 用户 + Prisma User(role=CONTRACTOR) + ContractorCompany(status=UNVERIFIED_PROFILE)
   → 设置 user-role cookie → 跳转 /register/business-profile
2. /register/business-profile → 填写 Business Info（含 Trade/Service Type 下拉必填）
   + Person in Charge + Insurance & Compliance + 勾选 T&C
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
→ 角色为 DATA_COLLECTOR 时额外显示 Zone 下拉（可选），选择后保存到 User.zoneId
→ Supabase inviteUserByEmail → 用户点击邮件链接 → /accept-invite → /set-password → 跳转对应 Dashboard

## Admin 审批功能（/admin/contractors）
显示 PENDING_APPROVAL + ACTION_REQUIRED 状态的 Contractor，展示完整 Business Profile（含 tradeType）：
- Approve → ACTIVE
- Request More Info → ACTION_REQUIRED（弹窗填写需要补充的内容）
- Reject → REJECTED（弹窗填写拒绝原因，存为 adminNote）

## 已完成模块

### 基础模块
- 数据库 Schema
- Contractor 注册（两步流程）/ 登录 / 状态路由
- 内部用户邀请（Admin → SALES/MARKETING/DATA_COLLECTOR）
- 忘记密码 / 重置密码 / 接受邀请 / 设置密码
- Admin Dashboard（Contractor审批完整资料展示、三按钮操作）
- Admin 用户管理（邀请内部用户）
- 统一密码规则（8位+大小写+数字+特殊字符）

### Data Collector 模块（/collector/*）
- /collector/dashboard：今日统计（采集数/Draft/Needs Fix）、Draft 快速续填卡片、Needs Fix 红色卡片
- /collector/leads：Lead 列表，⚠️ 标记 NEEDS_FIX
- /collector/leads/new：新建 Lead（Google Maps 选点 + 反向地理编码 + 语音转文字）
- /collector/leads/[id]：Lead 详情（Location/Photos/Demand+Contacts/Supply/Field Notes 分区）
  - 数据完整性提示条（缺 businessName/contacts/notes 时橙色警告）
  - NEEDS_FIX banner：显示 reviewComment，含 Edit & Resubmit 按钮
  - NotesForm：内联 Field Notes 编辑（不跳转页面）
- /collector/leads/[id]/edit：编辑页（Demand Side / Supply / Field Notes / Contacts 增删改）
- /collector/leads/new：表单顶部显示 "Your Zone: X"（只读），提交时自动写入 Lead.zoneId + zoneName
- /collector/dashboard：Header 显示当前 Zone badge，Recent Leads 表格含 Zone 列
- /collector/leads：Lead 列表含 Zone 列
- Server actions: resubmitLead（状态→RESUBMITTED，保留reviewComment）, updateLeadNotes, updateLeadDetails
- createLead action 支持 zoneId + zoneName 字段

### Admin Evaluation 模块（/admin/evaluation）
- 统计卡片（Backed/New/Urgent/Total）、Phase 彩色过滤 Tab
- Action Queue（URGENT 红色专区）
- 双列布局：Backed Leads（左）/ New Leads（右）
- New Leads 列卡片状态区分：
  - NEEDS_FIX：橙色背景 + "⚠ Needs Fix" badge + reviewComment 展示，只显示 Details + NeedsFixButton
  - RESUBMITTED：蓝色背景 + "✓ Resubmitted" badge + 原 reviewComment 展示（"Previously flagged:"），显示完整操作按钮
  - 普通：白色卡片 + 完整操作按钮 + NeedsFixButton
- NeedsFixButton：弹窗填写意见 → markLeadNeedsFix（status→NEEDS_FIX，保存reviewComment）
- Inject 按钮现改为 "Send to Marketing"，触发 injectLead → 状态→MARKETING_INBOX（不创建 Job）
- Server actions: backLead, markLeadUrgent, injectLead, parkLead, delayLead, markLeadNeedsFix

### Admin Parking 模块（/admin/parking）
- 注入队列（READY TODAY + Scheduled 双列）+ 横向 Phase 看板
- InjectionQueueCard 组件（内联操作按钮、日期选择弹窗、Phase 移动弹窗）
- scheduledInjectAt + isUrgent 字段

### Admin Lead Detail（/admin/leads/[id]）
- 6个 Section：Location / City Data / Demand Side（含 Contacts）/ Supply Side / Photos / Field Notes
- 所有 Section 均有空状态提示
- 有操作权限时显示 Actions 面板（Back/Urgent/Inject 等）
- Linked Jobs 列表可点击跳转
- SALES 角色可访问 /admin/evaluation, /admin/parking, /admin/leads/*

### Admin Job Board（/admin/jobs）
- Job 列表 + Phase 筛选 + 状态统计卡片
- 列表按钮：PENDING→"Fill Details"，READY→"Find Contractor"，其他→"View Offer"/"View Details"
- "Lead Detail" 按钮：所有状态均可跳转到对应 /admin/leads/[leadId]
- /admin/jobs/[id]：Fill Details 表单（serviceType, contractorType, scope, pricing, timeline）
  - 右上角 "View Lead Detail →" 链接
  - 保存后状态→READY
- /admin/jobs/[id]/match：Contractor 匹配页
  - 查询 ContractorCompany（status=ACTIVE），按地址(+2分)+tradeType(+1分)评分排序
  - 显示 tradeType、地址、联系人信息
  - 已发送 pending offer → 灰色 "Offer Sent"（不可重发）
  - 已拒绝 → 红色 "Declined" badge + 半透明卡片（可重新发送）
  - Send Offer → JobOffer(status=pending) + Job(status=OFFER_SENT)
- Server actions: updateJobDetails, sendJobOffer, cancelJob

### Contractor Jobs 模块（/contractor/jobs）
- 顶部统计卡片：New Offers（蓝）/ Active Jobs（绿）/ Completed（灰）
- Tab 筛选：New Offers | Active | Completed
- New Offers 卡片：只显示城市/区域（隐藏完整地址）、Phase、Service Type、Scope、Price、Timeline
  - Accept → JobOffer(accepted) + Job(ASSIGNED)
  - Decline → JobOffer(rejected) + Job(READY)，Job 重回匹配池
- Active/Completed 卡片：显示完整地址，点击进入详情
- /contractor/jobs/[id]：Job 详情
  - 完整 Job 信息（地址/Phase/serviceType/scope/price/timeline）
  - 状态更新：Start Job（ASSIGNED→IN_PROGRESS）/ Mark as Completed（IN_PROGRESS→COMPLETED）
  - Progress Notes：内联编辑，保存到 progressNote 字段
  - Progress Photos：占位（Coming Soon）
  - COMPLETED 时显示"Awaiting admin verification"提示
- Server actions（contractor-jobs.ts）: acceptOffer, rejectOffer, updateJobStatus, updateJobNote

### Admin Job Verification（/admin/jobs/[id]）
- 状态为 COMPLETED 时底部显示 "Progress Notes from Contractor" + 绿色 "Ready to Verify?" 区块
- Verify Job 按钮 → verifyJob action → 状态→VERIFIED
- 状态为 VERIFIED 时显示已完成提示

### Admin Permits Map（/admin/permits）
- 路由：/admin/permits，侧边栏入口在 User Management 上方（Map 图标）
- 数据来源：permits 表，通过 Supabase service role key 绕过 RLS 查询
- 布局：桌面端左右双栏；移动端顶部 List / Map tab 切换
- 左侧面板：
  - 搜索框：支持 permit #、地址、builder name、description 模糊搜索
  - Status 下拉筛选、Permit Type 下拉筛选、Year From 下拉（2010 至今）
  - 蓝色全宽 Search 按钮，结果数量显示
  - 每页 50 条，分页导航
  - Status badge 颜色：哈希法自动为每种状态分配不同颜色（15色调色板）
- 右侧地图（@vis.gl/react-google-maps）：
  - 按地址分组：同一地址多个 permits 只渲染一个 marker，避免重叠
  - Marker：lucide MapPin 图标，红色填充，选中时放大 1.25x
  - 多 permit 地址：右上角叠加蓝色数字角标显示总数
  - 点击 marker → InfoWindow 展示最新一条 permit 完整信息 + 其余 permits 列表（permit # / status badge / 日期）
  - 点击列表中的 permit → 地图 pan 到对应位置并打开 InfoWindow；移动端自动切换到 Map tab
- Geocoding：client-side，每页最多 50 个地址并发请求 Google Geocoding API，useRef 缓存 session 内已解析地址
- API：POST /api/admin/permits（Supabase service role，支持 q/status/permitType/yearFrom/page/perPage 参数）
- Server component (page.tsx)：Prisma 预取 distinct statuses、distinct permit_types、total count 作为 props 传入 client

### Admin Settings 模块（/admin/settings）
- Tab: General（占位）/ Zones
- Zones Tab：Zone 列表（名称/描述/颜色色块）、Add Zone 按钮、Edit/Delete 操作
- 新增/编辑弹窗：Zone Name（必填）、Description（选填）、Color（预设10色选择器）
- 删除确认弹窗：删除前自动解绑关联用户的 zoneId
- Server actions（settings.ts）: createZone, updateZone, deleteZone
- 侧边栏新增 Settings 入口（Settings 图标）

### Marketing 模块（/marketing/*）
- 布局：深蓝紫侧边栏（gradient）+ 白色顶栏
- 导航：Inbox / Activity（占位）
- /marketing/inbox：Marketing Inbox 主页面
  - 顶部 3 个 Tab：Inbox（蓝）/ Re-Activated（绿）/ Returned Error（红）
  - Inbox Tab：显示 MARKETING_INBOX 状态的 Lead 列表，Accept→TO_CONTACT / Return→INJECTED
  - 4 列看板：To Contact / Contacting / No Response / Contact Shared
  - 点击卡片弹出右侧详情面板（宽度 w-72）
  - 详情面板：Contact 信息 / Sentiment Tag（Hot Lead/Follow-up/Budget Approved）/ 跟进日期 / 备注编辑 / 操作按钮
  - 卡片显示：tag badge / 地址 / 联系人 / SLA倒计时（TO_CONTACT）/ Retry次数（NO_RESPONSE）/ follow-up日期 / sentimentTag
  - 操作：startContacting / markNoResponse / markContactEstablished / retryContact / parkLeadMarketing / qualifyLead
  - qualifyLead：Lead→QUALIFIED + 创建 Deal 记录
- Server actions（marketing.ts）: acceptInboxLead, rejectInboxLead, startContacting,
  markNoResponse, markContactEstablished, retryContact, parkLeadMarketing, setFollowUpDate,
  qualifyLead, updateMarketingNote, updateSentimentTag

### Route Tasks 模块
- 数据模型：RouteTask（id, name, polygon:Json, color, zoneId→Zone, createdById, assignedToId→User, status, createdAt, updatedAt）
- RouteTask.status 枚举：active（未认领）/ assigned（已认领）/ in_progress（采集中）/ completed（已完成）
- Lead 新增字段：routeTaskId→RouteTask（可选）
- User 新增关联：assignedTasks RouteTask[]

#### Admin（/admin/routes）
- 布局：白色左侧面板（任务列表）+ 右侧 Google Maps 全屏地图；手机端 Tasks/Map Tab 切换
- 标题栏与 Evaluation/Parking 风格一致（text-2xl font-black）
- 画区域：点击 "Draw New Zone" → 手动点击地图逐顶点绘制多边形（非 DrawingManager）
  - 手机端：Draw 按钮作为地图悬浮层（左上角）
  - 绘制中支持 Undo / Cancel / Close Polygon
- 保存面板（画完后地图底部弹出）：Task Name + 颜色选择器（10色）+ Zone 下拉 + Discard/Publish
- 任务列表：Unassigned / Claimed / In Progress / Completed 四组分类
  - Zone 下拉筛选（多 Zone 时显示）
  - 点击卡片 → 高亮地图上对应多边形并 pan
  - 地图上直接点击多边形也可选中对应任务（非绘制模式）
  - 所有区域始终以淡色显示，选中时高亮
- TaskCard 操作：改名（内联输入）/ 强制收回（Claimed/In Progress 时可用）/ 删除
- Server actions（route-tasks.ts）: createRouteTask, deleteRouteTask, updateRouteTaskStatus, renameRouteTask, adminReleaseRouteTask

#### Collector（/collector/routes）
- /collector/routes：列表页，显示所属 Zone 的任务，按 4 种状态分组展示
- /collector/routes/[id]：地图详情页，多边形颜色与 Admin 设定一致
  - 状态按钮：Accept Task（available）/ Start Collecting + Cancel Task（assigned，0 leads）/ Start Collecting + Done（in_progress）
  - Cancel Task：client 组件，点击弹确认框，调用 releaseRouteTask（仅限未提交 lead 时可取消）
  - Done：调用 completeRouteTask
- /collector/leads/new：地图顶部显示所属任务区域多边形（TaskPolygonOverlay，clickable:false 不拦截点击）
  - 任务 chip 显示在地图正上方，点击 chip 切换区域高亮；提交 lead 时自动写入 routeTaskId
  - 提交第一条 lead 时任务状态自动从 assigned → in_progress
- /collector/dashboard：My Routes 区块，4 状态卡片（Available/Claimed/In Progress/Completed）
- 权限：只能查看自己 Zone 的任务（user.zoneId 过滤）
- Server actions: acceptRouteTask（事务防竞争）, releaseRouteTask, completeRouteTask

## 开发规范
- 所有 UI 文字使用英文
- 使用 shadcn/ui 组件（contractor 端）/ 原生 Tailwind（admin/collector 端）
- 权限严格按照用户 Role 控制
- 数据隔离：Contractor 只能看到本公司（companyId）数据
- 新功能开发完成后及时 git commit
- Prisma enum 在旧生成客户端中需要 `as never` 或 `as string` 转型，待 prisma db push 后自动修复
- Job/JobOffer 均通过 companyId 关联 ContractorCompany（不是 Contractor）
- resubmitLead 不清除 reviewComment，保留供 admin 对照核查
