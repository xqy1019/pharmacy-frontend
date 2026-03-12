# 智能药房管理系统

> 面向医院药房的全流程数字化管理平台，覆盖药品档案、采购入库、库存管控、发药处方、销售收费、质量管理、统计分析等核心业务，并支持与 HIS 系统集成对接。

---

## 目录

- [项目概览](#项目概览)
- [技术栈](#技术栈)
- [快速启动](#快速启动)
- [目录结构](#目录结构)
- [功能模块](#功能模块)
- [权限系统](#权限系统)
- [API 文档](#api-文档)
- [测试账号](#测试账号)
- [数据库说明](#数据库说明)
- [开发规范](#开发规范)

---

## 项目概览

| 项目 | 说明 |
|------|------|
| 系统名称 | 智能药房管理系统 |
| 前端地址 | http://localhost:5173 |
| 后端地址 | http://localhost:4000 |
| API 文档 | http://localhost:4000/api-docs |

**核心亮点**

- **全合规管理**：麻醉和精神药品台账、双人核对、冷链温控（GSP 合规）
- **高警示拦截**：高警示药品发药二次确认 + LASA 外观相似警告
- **ADR 上报**：药品不良反应报告闭环管理
- **HIS 集成**：处方推送、药品映射、集成日志
- **RBAC 权限**：8 种专业角色，细粒度权限管控
- **数据分析**：科室用药分析、抗生素 DDD 强度统计

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| Vite | 6.x | 构建工具 |
| TailwindCSS | 3.x | 样式框架 |
| React Router | 6.x | 路由管理 |
| Axios | 1.x | HTTP 请求 |
| ECharts | 5.x | 数据可视化 |
| Ant Design | 6.x | UI 组件库 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| NestJS | 11.x | 服务端框架 |
| TypeORM | 0.3.x | ORM 框架 |
| SQLite | - | 数据库（开发环境） |
| JWT | - | 身份认证 |
| Swagger | - | API 文档 |
| PDFKit | 0.15.x | PDF 报表生成 |

---

## 快速启动

### 前提条件

- Node.js >= 18

### 一键启动

```bash
# 克隆项目后，进入根目录
bash start.sh
```

服务启动后：
- 前端：http://localhost:5173
- 后端：http://localhost:4000
- API 文档：http://localhost:4000/api-docs

按 `Ctrl+C` 同时停止前后端服务。

### 手动启动

需要开启两个终端分别启动前后端。

**第一步：安装依赖（首次运行执行）**

```bash
cd pharmacy-frontend && npm install
cd ../pharmacy-backend && npm install
```

**第二步：启动后端**

```bash
cd pharmacy-backend

npm run start:dev   # 开发模式（热重载）
npm run start       # 生产模式
npm run build       # 构建
```

后端启动后访问：
- API 服务：http://localhost:4000
- Swagger 文档：http://localhost:4000/api-docs

**第三步：启动前端（新开终端）**

```bash
cd pharmacy-frontend

npm run dev         # 开发模式（热重载）
npm run build       # 构建生产包
npm run preview     # 预览生产包
```

前端启动后访问：http://localhost:5173

### 环境变量

后端支持通过 `.env` 或 `.env.local` 配置（`.env.local` 优先）：

```env
PORT=4000          # 后端端口，默认 4000
```

---

## 目录结构

```
pharmacy/
├── pharmacy-frontend/          # 前端（React + Vite）
│   └── src/
│       ├── api/
│       │   └── pharmacy.js     # 全部 API 请求函数
│       ├── components/         # 公共组件
│       │   ├── Modal.jsx
│       │   ├── Pager.jsx
│       │   ├── PermGuard.jsx   # 权限守卫组件
│       │   ├── SummaryCard.jsx
│       │   ├── StatCard.jsx
│       │   ├── ChartCard.jsx
│       │   └── SectionCard.jsx
│       ├── config/
│       │   ├── modules.js      # 路由菜单配置
│       │   └── permissions.js  # 权限常量定义
│       ├── context/
│       │   ├── AuthContext.jsx  # 登录态上下文
│       │   └── ToastContext.jsx # 全局 Toast
│       ├── hooks/
│       │   ├── useAsyncData.js  # 异步数据加载 Hook
│       │   └── usePermission.js # 权限判断 Hook
│       ├── pages/              # 页面组件（详见功能模块）
│       ├── router/
│       │   └── index.jsx       # 路由配置 + 权限守卫
│       └── utils/
│           └── formatters.js   # 格式化工具函数
│
├── pharmacy-backend/           # 后端（NestJS）
│   └── src/
│       ├── common/             # 公共模块（Guard、Decorator、Filter）
│       ├── config/             # 配置模块
│       ├── modules/            # 业务模块
│       │   ├── ai/             # 智能补货预测
│       │   ├── auth/           # 身份认证（JWT）
│       │   ├── dashboard/      # 仪表盘数据
│       │   ├── iam/            # 用户/角色/权限管理
│       │   ├── integration/    # HIS 系统集成
│       │   ├── inventory/      # 库存管理
│       │   ├── prescription/   # 处方管理
│       │   ├── procurement/    # 采购管理
│       │   ├── quality/        # 质量管理
│       │   ├── reporting/      # 报表分析
│       │   ├── sales/          # 销售管理
│       │   ├── stocktake/      # 盘点管理
│       │   └── transfer/       # 调拨管理
│       ├── app.module.ts
│       ├── app.seed.ts         # 初始数据种子
│       └── main.ts
│
├── docs/                       # 项目文档
│   ├── HIS集成接口规范.md
│   └── 产品创意.md
├── start.sh                    # 一键启动脚本
└── README.md
```

---

## 功能模块

### 仪表盘 `/`

系统首页，展示今日核心 KPI 指标（处方量、发药量、库存预警数、销售额），以及库存预警趋势、近期采购动态等图表。

---

### 发药与处方管理 `/dispensing`

审方工作台，支持：
- 待审核处方队列展示
- 审方确认 / 拒绝操作
- **高警示药品二次确认**：检测到高警示药品时弹出二次确认弹窗
- **LASA 药品警告**：外观/名称相似药品混淆拦截提示
- 发药确认记录

---

### 药品管理

#### 药品档案 `/drug-master`

- 药品基础信息（通用名、规格、剂型、生产厂家、批准文号）
- 扩展字段：
  - `storageTemp`：冷链储存温度要求
  - `controlledType`：麻醉/精神药品分类
  - `insuranceType` / `insurancePrice`：医保类型与限价
  - `isLASA` / `lasaWarning`：LASA 外观相似标识与警告说明
- 列表标识 badge：冷链、麻精、医保、高警示、LASA
- 新增 / 编辑 Modal

#### 麻醉和精神药品 `/controlled-drugs`

麻醉和精神药品合规管理，三大 Tab：
- **麻精台账**：发药记录、双人核对验证、异常标记
- **空安瓿回收**：回收记录登记与核对
- **账物核查**：账面数量 vs 实物数量核查，生成核查报告

---

### 采购与入库管理

#### 采购管理 `/procurement`

- 采购计划列表 / 新建采购单
- 审批流：待审核 → 已批准 → 已完成
- 取消采购单
- 供应商关联

#### 出入库管理 `/warehouse`

三大 Tab：
- **入库单**：采购入库，批次号、效期录入
- **出库单**：手动出库记录
- **批次台账**：全批次库存明细

---

### 库存管理

#### 批次台账 `/inventory`

全库存批次列表，支持按药品名称、批次号、效期筛选。

#### 预警中心 `/inventory/alerts`

- 近效期预警（可配置预警天数）
- 低库存预警（低于安全库存阈值）
- 已过期药品提示

#### 货位视图 `/inventory/locations`

药房货架 / 货位库存可视化，支持货位查询与调整。

#### 冷链温控 `/inventory/temperature`

GSP 合规冷链管理：
- 冷藏设备实时温湿度监控列表
- 异常告警 Tab（超温/断电事件记录）
- 手动温度录入 Modal

#### 调拨与配送 `/allocation`

科室间药品调拨：
- 新建调拨单
- 发货确认
- 签收确认

---

### 销售与收费管理 `/sales`

- 销售订单列表
- 收款记录
- 退款处理
- 追溯码查询

---

### 盘点与质量管理

#### 盘点与损益 `/stocktake`

- 盘点任务创建 / 执行
- 差异审批（批准 / 驳回）
- 盈亏损益自动计算

#### 质量召回 `/quality`

- 召回任务发起（按批次、按供应商）
- 执行进度跟踪
- 召回完成确认
- 工具栏快捷跳转 ADR 上报

#### ADR 不良反应上报 `/quality/adr`

- ADR 报告新建与提交
- 严重程度分级（轻微 / 中等 / 严重 / 危及生命）
- 报告详情查看
- 待提交 / 已提交状态管理

---

### 统计报表与分析中心 `/analytics`

多维度数据分析：
- 库存周转率、采购金额趋势
- **科室用药分析**：各科室用药排名，抗生素占比告警
- **抗生素 DDD 强度分析**：按月度统计各类抗生素 DDD 值

---

### 系统管理

#### 用户管理 `/system/users`

- 用户列表查询
- 新建 / 编辑用户
- 角色分配

#### 角色权限 `/system/roles`

- 角色列表
- 权限矩阵配置（按模块分组）
- 创建自定义角色

#### 审计日志 `/system/audit`

操作审计全记录，支持按用户、时间、操作类型筛选。

#### 系统集成配置 `/system/integration`

HIS 系统集成管理：
- HIS 接口配置（地址 / 认证参数）
- 药品映射关系维护
- 集成日志查询

---

## 权限系统

### 角色列表

| 角色 | roleCode | 职责说明 | 测试账号 |
|------|----------|---------|---------|
| 系统管理员 | `admin` | 全部权限，系统配置 | admin / admin123 |
| 药房主管 | `supervisor` | 全数据查看、报表、审计、审批 | supervisor / sup123 |
| 门诊药剂师 | `outpatient_pharmacist` | 处方、发药、销售、库存 | outpatient / out123 |
| 住院药剂师 | `inpatient_pharmacist` | 住院处方、库存、调拨 | inpatient / inp123 |
| 药库药师 | `warehouse_pharmacist` | 采购、库存、盘点、调拨、供应商 | warehouse / war123 |
| 麻醉药师 | `anesthesia_pharmacist` | 麻精库存、冻结、盘点、调拨 | anespharm / anes123 |
| 麻醉医师 | `anesthesiologist` | 处方查看、销售查看（只读） | anesdoc / anes456 |
| 发药员 | `dispense_clerk` | 处方审核、发药确认、销售查看 | clerk / cle123 |

### 权限码说明

权限码格式：`{模块}.{资源}.{操作}`，例如 `procurement.order.approve`。

| 模块 | 权限码示例 |
|------|-----------|
| 仪表盘 | `dashboard.view` |
| 库存管理 | `inventory.drug.manage`, `inventory.batch.manage` |
| 采购管理 | `procurement.order.view`, `procurement.order.create`, `procurement.order.approve` |
| 处方管理 | `prescription.view`, `prescription.review` |
| 调拨管理 | `transfer.view`, `transfer.create`, `transfer.sign` |
| 盘点管理 | `stocktake.view`, `stocktake.create` |
| 质量管理 | `quality.recall.view`, `quality.recall.create`, `quality.batch.freeze` |
| 销售管理 | `sales.order.view`, `sales.order.create`, `sales.trace.view` |
| 麻精管理 | `controlled.drug.manage`, `controlled.drug.view` |
| 报表 | `report.kpi.view` |
| IAM | `iam.user.view`, `iam.role.view`, `iam.audit.view` |
| 系统集成 | `integration.job.view`, `integration.push` |

### 前端权限使用

```jsx
// Hook 方式
import { usePermission } from '@/hooks/usePermission';
const { hasPerm, hasRole } = usePermission();
if (hasPerm('procurement.order.approve')) { ... }

// 组件方式（无权限则不渲染）
import PermGuard from '@/components/PermGuard';
<PermGuard perm="procurement.order.approve">
  <button>审批</button>
</PermGuard>
```

---

## API 文档

启动后端后访问：http://localhost:4000/api-docs

### 主要端点

| 模块 | 端点前缀 |
|------|---------|
| 认证 | `POST /api/auth/login` |
| 药品档案 | `GET/POST /api/drugs`, `PATCH /api/drugs/:id` |
| 库存 | `/api/inventory/...` |
| 采购 | `/api/v1/procurement/...` |
| 调拨 | `/api/v1/transfers/...` |
| 处方 | `/api/v1/prescriptions/...` |
| 销售 | `/api/v1/sales/...` |
| 盘点 | `/api/v1/stocktakes/...` |
| 质量召回 | `/api/v1/quality/recalls/...` |
| ADR 上报 | `/api/v1/quality/adr-reports/...` |
| 麻精药品 | `/api/v1/controlled-drugs/...` |
| 报表 | `/api/v1/reports/...` |
| IAM | `/api/v1/iam/...` |
| HIS 集成 | `/api/v1/his/...` |

所有接口（除登录外）需携带 JWT Token：

```http
Authorization: Bearer <token>
```

---

## 测试账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 系统管理员（全部权限） |
| supervisor | sup123 | 药房主管 |
| outpatient | out123 | 门诊药剂师 |
| inpatient | inp123 | 住院药剂师 |
| warehouse | war123 | 药库药师 |
| anespharm | anes123 | 麻醉药师 |
| anesdoc | anes456 | 麻醉医师（只读） |
| clerk | cle123 | 发药员 |

---

## 数据库说明

开发环境使用 **SQLite**，数据库文件位于 `pharmacy-backend/` 目录下，首次启动时自动创建并执行种子数据（`app.seed.ts`）。

种子数据包含：
- 测试账号与角色
- 权限矩阵初始配置
- 示例药品档案
- 示例库存批次数据

---

## 开发规范

### 前端代码规范

**组件使用约定**

| 场景 | 组件/方式 |
|------|----------|
| 弹窗 | `<Modal maxWidth="...">` |
| 统计卡 | `<SummaryCard accent="渐变类">` |
| 分页 | `<Pager>` |
| 权限守卫 | `<PermGuard perm="...">` |
| 异步数据 | `useAsyncData(fn, deps)` → `{ data, loading, error }` |
| 消息提示 | `useToast()` → `toast.success/error/info/warning` |
| 格式化 | `formatNumber/formatDate/formatDateTime/formatPercent` |

**样式规范**

```
# 主工作区容器
rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]

# 状态 Badge
rounded-full px-2.5 py-0.5 text-xs font-medium

# 表格行
border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70
```

### 新增页面步骤

1. 在 `src/pages/` 创建页面组件
2. 在 `src/router/index.jsx` 添加路由（配置 `RequirePerm`）
3. 在 `src/config/modules.js` 添加菜单项（配置 `requiredPerm`）
4. 在 `src/api/pharmacy.js` 添加对应 API 函数

### 后端新增模块步骤

1. 在 `src/modules/` 创建模块目录
2. 创建 `entity`、`dto`、`service`、`controller`
3. Controller 添加 `@UseGuards(JwtAuthGuard, PermissionGuard)` 和 `@Perms`
4. 在 `app.module.ts` 注册模块

---

## 待实现功能（规划中）

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 麻精药品后端模块 | P1 | 台账/空安瓿/核查接口（当前为 Mock） |
| ADR 上报后端模块 | P1 | ADR 报告持久化（当前为 Mock） |
| 供应商资质档案 | P2 | 供应商证照到期提醒 |
| HIS 处方接口对接 | P2 | 实时推送处方至 HIS |
| 医保结算接口 | P2 | 对接医保平台 |
| 各模块数据导出 | P3 | Excel / PDF 导出 |

---

> 如有问题，请查阅 `docs/` 目录下的详细规范文档，或参考 Swagger API 文档。
