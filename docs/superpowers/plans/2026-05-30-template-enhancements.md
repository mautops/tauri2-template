# Template Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Tauri v2 + React 模板添加 7 个通用基础设施功能，让使用模板的开发者开箱即用，无需自行搭建。

**Architecture:** 7 个独立子系统按依赖顺序实现：环境配置（基础）→ 路由（改变 App 结构）→ 表单验证 → 数据库迁移 → API Client → CLI 参数 → 通知管理。每个子系统可独立执行、独立测试、独立提交。

**Tech Stack:** TanStack Router v1 (file-based)、react-hook-form v7、zod v3、tauri-plugin-sql (已有)、tauri-plugin-cli (需添加)

---

## 背景

当前模板缺少：

- 环境变量体系（无 `.env` 文件，无运行时配置封装）
- 路由（App.tsx 中硬编码条件渲染）
- 表单验证（有 37 个 UI 组件但无表单库）
- 数据库迁移（tauri-plugin-sql 已注册但 `migrations: vec![]`）
- HTTP API 客户端（`@tauri-apps/plugin-http` 已注册但无封装）
- CLI 参数解析（无 `tauri-plugin-cli` 集成）
- 通知管理 hook（`send_native_notification` 存在但无 React hook、无权限管理、无设置开关）

---

## 文件结构总览

### 新建文件

```
src/env.ts                              # 环境变量封装 + Zod 校验
.env.example                            # 示例环境变量文件
src/routes/                             # TanStack Router file-based 路由目录
  __root.tsx                            # 根路由（全局 layout）
  index.tsx                             # / → 重定向到 /app
  login.tsx                             # /login 页面
  app.tsx                               # /app layout（需要登录）
  app/
    dashboard.tsx                       # /app/dashboard 示例页
src/router.ts                           # Router 实例
src/lib/forms.ts                        # react-hook-form + zod 通用工具
src/hooks/use-notification.ts           # 通知管理 hook
src/lib/api-client.ts                   # HTTP API 客户端封装
src-tauri/src/commands/cli.rs           # CLI 参数处理命令
src-tauri/migrations/                   # SQL migration 文件目录
  001_initial.sql                       # 初始化 schema（users 示例表）
```

### 修改文件

```
src/App.tsx                             # 替换条件渲染为 Router，集成 env 初始化
src/main.tsx                            # 添加 RouterProvider
src-tauri/src/lib.rs                    # 注册 cli plugin，传入 migrations
src-tauri/src/bindings.rs              # 注册 cli 命令
src-tauri/src/commands/mod.rs          # 添加 cli 模块
src-tauri/Cargo.toml                   # 添加 tauri-plugin-cli
src-tauri/tauri.conf.json             # 添加 cli plugin 配置
package.json                           # 添加 @tanstack/react-router、react-hook-form、zod
src/components/preferences/            # 添加通知设置开关
locales/en.json                        # 添加新功能的 i18n key
locales/zh.json                        # 同上
```

---

## 子系统 A：环境变量配置

### Task 1：创建 .env 体系和类型安全封装

**Files:**

- Create: `.env.example`
- Create: `.env`（gitignore 中已有，本地使用）
- Create: `src/env.ts`
- Modify: `src/App.tsx`（在初始化最顶部调用 env 校验）
- Modify: `.gitignore`（确保 `.env` 已忽略）

- [ ] **Step 1: 检查 .gitignore 是否已忽略 .env**

```bash
grep -n "\.env" .gitignore
```

如果没有 `.env` 条目，在 .gitignore 末尾添加：

```
.env
.env.local
```

- [ ] **Step 2: 创建 `.env.example`**

```bash
cat > .env.example << 'EOF'
# API 配置（可选，留空则使用 mock 数据）
VITE_API_BASE_URL=https://api.example.com
VITE_API_TIMEOUT_MS=10000

# 功能开关（可选，默认 false）
VITE_ENABLE_DEVTOOLS=false
VITE_ENABLE_MOCK_API=false

# 应用标识（可选）
VITE_APP_ENV=development
EOF
```

- [ ] **Step 3: 创建 `.env`（本地开发用，不提交）**

```bash
cp .env.example .env
```

- [ ] **Step 4: 安装 zod**

```bash
npm install zod
```

确认安装成功：

```bash
node -e "require('./node_modules/zod/lib/index.js'); console.log('ok')"
```

- [ ] **Step 5: 写 env.ts 的测试**

新建 `src/env.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses default values when env vars are not set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.stubEnv('VITE_API_TIMEOUT_MS', '')
    vi.stubEnv('VITE_ENABLE_DEVTOOLS', '')
    vi.stubEnv('VITE_ENABLE_MOCK_API', '')
    vi.stubEnv('VITE_APP_ENV', '')

    const { env } = await import('./env')
    expect(env.API_BASE_URL).toBe('')
    expect(env.API_TIMEOUT_MS).toBe(10000)
    expect(env.ENABLE_DEVTOOLS).toBe(false)
    expect(env.ENABLE_MOCK_API).toBe(false)
    expect(env.APP_ENV).toBe('development')
  })

  it('parses string booleans correctly', async () => {
    vi.stubEnv('VITE_ENABLE_DEVTOOLS', 'true')
    vi.stubEnv('VITE_ENABLE_MOCK_API', 'false')

    const { env } = await import('./env')
    expect(env.ENABLE_DEVTOOLS).toBe(true)
    expect(env.ENABLE_MOCK_API).toBe(false)
  })

  it('parses numeric string correctly', async () => {
    vi.stubEnv('VITE_API_TIMEOUT_MS', '5000')

    const { env } = await import('./env')
    expect(env.API_TIMEOUT_MS).toBe(5000)
  })
})
```

- [ ] **Step 6: 运行测试，确认失败**

```bash
npm run test -- src/env.test.ts
```

预期：FAIL，提示 `cannot find module './env'`

- [ ] **Step 7: 创建 `src/env.ts`**

```typescript
import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default(''),
  VITE_API_TIMEOUT_MS: z
    .string()
    .default('10000')
    .transform(v => parseInt(v, 10)),
  VITE_ENABLE_DEVTOOLS: z
    .string()
    .default('false')
    .transform(v => v === 'true'),
  VITE_ENABLE_MOCK_API: z
    .string()
    .default('false')
    .transform(v => v === 'true'),
  VITE_APP_ENV: z.string().default('development'),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format())
  throw new Error(
    'Invalid environment variables — check .env.example for required fields'
  )
}

const raw = parsed.data

export const env = {
  API_BASE_URL: raw.VITE_API_BASE_URL,
  API_TIMEOUT_MS: raw.VITE_API_TIMEOUT_MS,
  ENABLE_DEVTOOLS: raw.VITE_ENABLE_DEVTOOLS,
  ENABLE_MOCK_API: raw.VITE_ENABLE_MOCK_API,
  APP_ENV: raw.VITE_APP_ENV,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const

export type Env = typeof env
```

- [ ] **Step 8: 运行测试，确认通过**

```bash
npm run test -- src/env.test.ts
```

预期：PASS（3 tests）

- [ ] **Step 9: 在 App.tsx 顶部导入 env，确保启动时校验**

在 `src/App.tsx` 第 1 行之前（import 列表顶部）添加：

```typescript
import '@/env' // validates env vars at startup
```

- [ ] **Step 10: 提交**

```bash
git add .env.example src/env.ts src/env.test.ts src/App.tsx .gitignore
git commit -m "feat: add type-safe environment variable system with zod validation"
```

---

## 子系统 B：TanStack Router（file-based）

### Task 2：安装并配置 TanStack Router

**Files:**

- Modify: `package.json`（添加依赖）
- Modify: `vite.config.ts`（添加 TanStack Router Vite plugin）
- Create: `src/router.ts`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`
- Create: `src/routes/login.tsx`
- Create: `src/routes/app.tsx`
- Create: `src/routes/app/dashboard.tsx`
- Modify: `src/App.tsx`（移除条件渲染，集成 RouterProvider）
- Modify: `src/main.tsx`

- [ ] **Step 1: 安装依赖**

```bash
npm install @tanstack/react-router
npm install -D @tanstack/router-plugin @tanstack/router-devtools
```

- [ ] **Step 2: 配置 Vite plugin 以启用 file-based 路由**

读取 `vite.config.ts`，在插件列表中添加 TanStack Router Plugin。找到 `plugins: [` 数组，在第一个位置添加：

```typescript
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
```

并在 `plugins` 数组最前面加入：

```typescript
TanStackRouterVite({ routesDirectory: './src/routes', generatedRouteTree: './src/routeTree.gen.ts' }),
```

最终 vite.config.ts 的 plugins 数组开头：

```typescript
plugins: [
  TanStackRouterVite({
    routesDirectory: './src/routes',
    generatedRouteTree: './src/routeTree.gen.ts',
  }),
  react({  // 原有的 react plugin
```

- [ ] **Step 3: 将 routeTree.gen.ts 加入 .gitignore**

在 `.gitignore` 末尾添加：

```
src/routeTree.gen.ts
```

- [ ] **Step 4: 创建路由目录**

```bash
mkdir -p src/routes/app
```

- [ ] **Step 5: 创建根路由 `src/routes/__root.tsx`**

这是全局 layout，包含 ThemeProvider、ErrorBoundary，并处理 splash screen 逻辑：

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { env } from '@/env'

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <ThemeProvider>
        <Outlet />
        {env.ENABLE_DEVTOOLS && import.meta.env.DEV && (
          <TanStackRouterDevtools />
        )}
      </ThemeProvider>
    </ErrorBoundary>
  ),
})
```

- [ ] **Step 6: 创建 index 路由 `src/routes/index.tsx`**

根路径 `/`，根据认证状态重定向：

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth-store'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      throw redirect({ to: '/app/dashboard' })
    } else {
      throw redirect({ to: '/login' })
    }
  },
  component: () => null,
})
```

- [ ] **Step 7: 创建 login 路由 `src/routes/login.tsx`**

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoginPage } from '@/components/auth/LoginPage'
import { useAuthStore } from '@/store/auth-store'
import { useEffect } from 'react'

export const Route = createFileRoute('/login')({
  component: LoginRoute,
})

function LoginRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/app/dashboard' })
    }
  }, [isAuthenticated, navigate])

  return <LoginPage />
}
```

- [ ] **Step 8: 创建 app layout 路由 `src/routes/app.tsx`**

受保护路由，未登录自动跳到 `/login`：

```tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth-store'
import { MainWindow } from '@/components/layout/MainWindow'

export const Route = createFileRoute('/app')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <MainWindow>
      <Outlet />
    </MainWindow>
  )
}
```

- [ ] **Step 9: 修改 `src/components/layout/MainWindow.tsx` 接受 children**

读取当前 `MainWindow.tsx`，找到 `<MainWindowContent />` 组件，将其改为支持 children：

在 `MainWindow` 组件的 props interface 中添加 `children?: React.ReactNode`，然后在 `<MainWindowContent>` 中传入 `children`。

**注意：** 读取文件后确认 MainWindowContent 的当前接口，再修改。

- [ ] **Step 10: 创建 dashboard 路由 `src/routes/app/dashboard.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/app/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
      <p className="text-muted-foreground">{t('dashboard.description')}</p>
    </div>
  )
}
```

- [ ] **Step 11: 创建 `src/router.ts`**

```typescript
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

- [ ] **Step 12: 添加 i18n key**

在 `locales/en.json` 中添加：

```json
"dashboard": {
  "title": "Dashboard",
  "description": "Welcome to your app. Start building here."
}
```

在 `locales/zh.json` 中添加：

```json
"dashboard": {
  "title": "仪表盘",
  "description": "欢迎使用。从这里开始构建你的应用。"
}
```

- [ ] **Step 13: 重构 App.tsx 使用 RouterProvider**

将 `src/App.tsx` 中的 SplashScreen / MainWindow / LoginPage 条件渲染逻辑替换为 RouterProvider。

旧的渲染逻辑（大约 121-133 行）：

```tsx
return (
  <ErrorBoundary>
    <ThemeProvider>
      {!ready ? (
        <SplashScreen />
      ) : isAuthenticated ? (
        <MainWindow />
      ) : (
        <LoginPage />
      )}
    </ThemeProvider>
  </ErrorBoundary>
)
```

替换为：

```tsx
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

// 在 return 处：
return !ready ? <SplashScreen /> : <RouterProvider router={router} />
```

注意：ThemeProvider 和 ErrorBoundary 已在 `__root.tsx` 中，不再在 App.tsx 中包裹。

同时从 App.tsx 中删除不再使用的 import：

- `MainWindow`
- `LoginPage`
- `useAuthStore`（如果仅用于认证判断）

- [ ] **Step 14: 更新 LoginPage，登录成功后使用 router 导航**

读取 `src/components/auth/LoginPage.tsx`，找到 `login()` 成功后的处理逻辑。将任何 `setState` 跳转替换为：

```typescript
import { useNavigate } from '@tanstack/react-router'

const navigate = useNavigate()
// 登录成功后：
navigate({ to: '/app/dashboard' })
```

- [ ] **Step 15: 运行开发构建，验证路由正常**

```bash
npm run build
```

预期：构建成功，`src/routeTree.gen.ts` 被自动生成，无 TypeScript 报错。

- [ ] **Step 16: 提交**

```bash
git add src/routes/ src/router.ts src/App.tsx src/main.tsx vite.config.ts .gitignore locales/en.json locales/zh.json src/components/
git commit -m "feat: add TanStack Router with file-based routing and auth guards"
```

---

## 子系统 C：表单验证（react-hook-form + zod）

### Task 3：安装并创建表单工具层

**Files:**

- Create: `src/lib/forms.ts`（通用 form utilities）
- Create: `src/components/ui/form.tsx`（shadcn/ui form 组件）
- Create: `src/routes/app/form-demo.tsx`（示例表单页，演示用法）
- Modify: `locales/en.json`、`locales/zh.json`

- [ ] **Step 1: 安装依赖**

```bash
npm install react-hook-form @hookform/resolvers
```

zod 已在 Task 1 安装。确认：

```bash
node -e "require('./node_modules/react-hook-form/dist/index.cjs.js'); console.log('ok')"
```

- [ ] **Step 2: 添加 shadcn/ui form 组件**

shadcn/ui 的 form 组件是对 react-hook-form 的封装。创建 `src/components/ui/form.tsx`：

```tsx
import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { Slot } from '@radix-ui/react-slot'
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>')
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn('space-y-2', className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = 'FormItem'

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && 'text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = 'FormLabel'

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = 'FormControl'

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
})
FormDescription.displayName = 'FormDescription'

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? '') : children

  if (!body) return null

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn('text-destructive text-sm font-medium', className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = 'FormMessage'

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
```

- [ ] **Step 3: 创建 `src/lib/forms.ts`**

提供通用的 zod schema 片段和 resolver 工厂，供各表单复用：

```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { type UseFormProps, useForm } from 'react-hook-form'
import { type ZodSchema, type z } from 'zod'

export function useZodForm<TSchema extends ZodSchema>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver'>
) {
  return useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    ...options,
  })
}

export { z } from 'zod'
```

- [ ] **Step 4: 写 forms.ts 的测试**

新建 `src/lib/forms.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { useZodForm } from './forms'

describe('useZodForm', () => {
  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
  })

  it('initializes with default values', () => {
    const { result } = renderHook(() =>
      useZodForm(schema, { defaultValues: { name: '', email: '' } })
    )
    expect(result.current.getValues()).toEqual({ name: '', email: '' })
  })

  it('validates and returns errors for invalid data', async () => {
    const { result } = renderHook(() =>
      useZodForm(schema, { defaultValues: { name: '', email: 'not-an-email' } })
    )

    await act(async () => {
      await result.current.trigger()
    })

    expect(result.current.formState.errors.name?.message).toBe(
      'Name is required'
    )
    expect(result.current.formState.errors.email?.message).toBe('Invalid email')
  })

  it('passes validation for valid data', async () => {
    const { result } = renderHook(() =>
      useZodForm(schema, {
        defaultValues: { name: 'Alice', email: 'alice@example.com' },
      })
    )

    await act(async () => {
      await result.current.trigger()
    })

    expect(result.current.formState.isValid).toBe(true)
  })
})
```

- [ ] **Step 5: 运行测试，确认失败**

```bash
npm run test -- src/lib/forms.test.ts
```

预期：FAIL，`cannot find module './forms'`

- [ ] **Step 6: 运行测试，确认通过**

```bash
npm run test -- src/lib/forms.test.ts
```

预期：PASS（3 tests）

- [ ] **Step 7: 创建 form-demo 路由**

新建 `src/routes/app/form-demo.tsx`，演示 react-hook-form + zod 的完整用法：

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useZodForm } from '@/lib/forms'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/form-demo')({
  component: FormDemoPage,
})

const profileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  bio: z.string().max(200, 'Bio must be 200 characters or less').optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

function FormDemoPage() {
  const { t } = useTranslation()

  const form = useZodForm(profileSchema, {
    defaultValues: { displayName: '', email: '', bio: '' },
  })

  function onSubmit(values: ProfileFormValues) {
    toast.success(`Profile saved: ${values.displayName}`)
    console.log(values)
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold">{t('formDemo.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('formDemo.description')}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('formDemo.fields.displayName')}</FormLabel>
                <FormControl>
                  <Input placeholder="Alice" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('formDemo.fields.email')}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="alice@example.com"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('formDemo.fields.emailHint')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('formDemo.fields.bio')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('formDemo.fields.bioPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('formDemo.fields.bioHint')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t('formDemo.submit')}
          </Button>
        </form>
      </Form>
    </div>
  )
}
```

- [ ] **Step 8: 添加 i18n key**

在 `locales/en.json` 中添加：

```json
"formDemo": {
  "title": "Form Demo",
  "description": "Demonstrates react-hook-form with zod validation.",
  "fields": {
    "displayName": "Display Name",
    "email": "Email",
    "emailHint": "We'll never share your email.",
    "bio": "Bio",
    "bioPlaceholder": "Tell us about yourself...",
    "bioHint": "Max 200 characters."
  },
  "submit": "Save Profile"
}
```

在 `locales/zh.json` 中添加：

```json
"formDemo": {
  "title": "表单示例",
  "description": "演示 react-hook-form 配合 zod 校验的用法。",
  "fields": {
    "displayName": "显示名称",
    "email": "邮箱",
    "emailHint": "我们不会分享你的邮箱。",
    "bio": "简介",
    "bioPlaceholder": "介绍一下你自己...",
    "bioHint": "最多 200 个字符。"
  },
  "submit": "保存资料"
}
```

- [ ] **Step 9: 运行全量测试**

```bash
npm run test
```

预期：所有测试 PASS

- [ ] **Step 10: 提交**

```bash
git add src/lib/forms.ts src/lib/forms.test.ts src/components/ui/form.tsx src/routes/app/form-demo.tsx locales/
git commit -m "feat: add react-hook-form + zod form validation with shadcn/ui form components"
```

---

## 子系统 D：数据库迁移系统

### Task 4：为 SQLite 添加 migration 体系和示例表

**Files:**

- Create: `src-tauri/migrations/001_initial.sql`
- Modify: `src-tauri/src/lib.rs`（传入 migrations）
- Create: `src-tauri/src/commands/database.rs`（示例 CRUD 命令）
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/bindings.rs`
- Create: `src/services/database.ts`（TanStack Query hooks）
- Create: `src/routes/app/db-demo.tsx`（示例页）
- Modify: `locales/en.json`、`locales/zh.json`

- [ ] **Step 1: 创建 migrations 目录和初始 SQL**

```bash
mkdir -p src-tauri/migrations
```

创建 `src-tauri/migrations/001_initial.sql`：

```sql
-- 示例用户笔记表，供模板演示 CRUD 操作
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 触发器：自动更新 updated_at
CREATE TRIGGER IF NOT EXISTS notes_updated_at
  AFTER UPDATE ON notes
  FOR EACH ROW
BEGIN
  UPDATE notes SET updated_at = datetime('now') WHERE id = OLD.id;
END;
```

- [ ] **Step 2: 修改 lib.rs，传入 migration 文件**

读取 `src-tauri/src/lib.rs`，找到 SQL 初始化代码（约 196-210 行）：

```rust
tauri_plugin_sql::Builder::default()
    .add_migrations("sqlite:app.db", vec![])
    .build()
```

替换为：

```rust
use tauri_plugin_sql::{Migration, MigrationKind};

let migrations = vec![Migration {
    version: 1,
    description: "create_initial_tables",
    sql: include_str!("../migrations/001_initial.sql"),
    kind: MigrationKind::Up,
}];

tauri_plugin_sql::Builder::default()
    .add_migrations("sqlite:app.db", migrations)
    .build()
```

同时在文件顶部已有的 use 语句处确认 `tauri_plugin_sql` 相关 import 已存在（或添加）。

- [ ] **Step 3: 创建 `src-tauri/src/commands/database.rs`**

```rust
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri_plugin_sql::{DbPool, PoolOptions};

#[derive(Debug, Serialize, Deserialize, Type, Clone)]
pub struct Note {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, Type)]
pub struct CreateNoteInput {
    pub title: String,
    pub content: String,
}

#[tauri::command]
#[specta::specta]
pub async fn get_notes(app: tauri::AppHandle) -> Result<Vec<Note>, String> {
    let db = get_db(&app).await?;
    let rows = sqlx::query_as!(
        Note,
        "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY created_at DESC"
    )
    .fetch_all(&db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
#[specta::specta]
pub async fn create_note(app: tauri::AppHandle, input: CreateNoteInput) -> Result<Note, String> {
    if input.title.trim().is_empty() {
        return Err("Title cannot be empty".to_string());
    }
    if input.title.len() > 200 {
        return Err("Title must be 200 characters or less".to_string());
    }

    let db = get_db(&app).await?;
    let row = sqlx::query_as!(
        Note,
        "INSERT INTO notes (title, content) VALUES (?, ?) RETURNING id, title, content, created_at, updated_at",
        input.title.trim(),
        input.content
    )
    .fetch_one(&db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_note(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let db = get_db(&app).await?;
    sqlx::query!("DELETE FROM notes WHERE id = ?", id)
        .execute(&db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn get_db(app: &tauri::AppHandle) -> Result<DbPool, String> {
    app.state::<DbPool>()
        .inner()
        .get()
        .await
        .map_err(|e| e.to_string())
}
```

**注意：** `tauri-plugin-sql` 的实际 API 依赖其版本。如果上述 `DbPool`/`sqlx` 方式不匹配当前 plugin 版本，改用 plugin 提供的 `Database` 方式：

```rust
use tauri_plugin_sql::Database;

async fn get_db(app: &tauri::AppHandle) -> Result<Database, String> {
    Database::load(app, "sqlite:app.db")
        .await
        .map_err(|e| e.to_string())
}
```

执行查询时改为：

```rust
let rows: Vec<Note> = db
    .select("SELECT id, title, content, created_at, updated_at FROM notes ORDER BY created_at DESC")
    .await
    .map_err(|e| e.to_string())?;
```

- [ ] **Step 4: 注册模块**

在 `src-tauri/src/commands/mod.rs` 末尾添加：

```rust
pub mod database;
```

在 `src-tauri/src/bindings.rs` 的 commands 列表中添加：

```rust
database::get_notes,
database::create_note,
database::delete_note,
```

- [ ] **Step 5: 编译验证**

```bash
cd src-tauri && cargo check 2>&1 | head -50
```

预期：无 error（warnings 可接受）。如有 error，根据错误信息调整 database.rs 的 API 用法。

- [ ] **Step 6: 重新生成 TypeScript bindings**

```bash
npm run tauri dev -- --no-watch 2>&1 | head -20
```

或直接运行 cargo build（dev 模式会自动导出 bindings）：

```bash
cd src-tauri && cargo build 2>&1 | tail -10
```

这会更新 `src/lib/bindings.ts`。

- [ ] **Step 7: 创建 `src/services/database.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const result = await commands.getNotes()
      if (result.status === 'error') throw new Error(result.error)
      return result.data
    },
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { title: string; content: string }) => {
      const result = await commands.createNote(input)
      if (result.status === 'error') throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const result = await commands.deleteNote(id)
      if (result.status === 'error') throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}
```

- [ ] **Step 8: 创建 `src/routes/app/db-demo.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Plus } from 'lucide-react'
import { useNotes, useCreateNote, useDeleteNote } from '@/services/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/db-demo')({
  component: DbDemoPage,
})

function DbDemoPage() {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const { data: notes = [], isLoading } = useNotes()
  const createNote = useCreateNote()
  const deleteNote = useDeleteNote()

  async function handleCreate() {
    if (!title.trim()) return
    try {
      await createNote.mutateAsync({ title: title.trim(), content: '' })
      setTitle('')
    } catch (e) {
      toast.error(String(e))
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteNote.mutateAsync(id)
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-lg">
      <h1 className="text-2xl font-semibold">{t('dbDemo.title')}</h1>

      <div className="flex gap-2">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={t('dbDemo.placeholder')}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <Button
          onClick={handleCreate}
          disabled={createNote.isPending || !title.trim()}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      ) : notes.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('dbDemo.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map(note => (
            <li
              key={note.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span className="text-sm">{note.title}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(note.id)}
                disabled={deleteNote.isPending}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 9: 添加 i18n key**

`locales/en.json`:

```json
"dbDemo": {
  "title": "Database Demo",
  "placeholder": "New note title...",
  "empty": "No notes yet. Create one above."
},
"common": {
  "loading": "Loading..."
}
```

`locales/zh.json`:

```json
"dbDemo": {
  "title": "数据库示例",
  "placeholder": "新笔记标题...",
  "empty": "还没有笔记，在上方创建一个吧。"
},
"common": {
  "loading": "加载中..."
}
```

- [ ] **Step 10: 提交**

```bash
git add src-tauri/migrations/ src-tauri/src/commands/database.rs src-tauri/src/commands/mod.rs src-tauri/src/bindings.rs src-tauri/src/lib.rs src/services/database.ts src/routes/app/db-demo.tsx locales/
git commit -m "feat: add SQLite migration system with notes CRUD example"
```

---

## 子系统 E：HTTP API Client 封装

### Task 5：创建类型安全的 HTTP 客户端

**Files:**

- Create: `src/lib/api-client.ts`
- Create: `src/lib/api-client.test.ts`
- Modify: `src/env.ts`（已有 API_BASE_URL，无需改）

- [ ] **Step 1: 写 api-client 的测试**

新建 `src/lib/api-client.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch (Tauri HTTP plugin uses the global fetch API in newer versions)
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('makes GET request with correct URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, name: 'Alice' }),
    })

    const { createApiClient } = await import('./api-client')
    const client = createApiClient('https://api.example.com')
    const result = await client.get<{ id: number; name: string }>('/users/1')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result).toEqual({ id: 1, name: 'Alice' })
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'User not found' }),
    })

    const { createApiClient } = await import('./api-client')
    const client = createApiClient('https://api.example.com')

    await expect(client.get('/users/999')).rejects.toThrow('User not found')
  })

  it('makes POST request with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 2, name: 'Bob' }),
    })

    const { createApiClient } = await import('./api-client')
    const client = createApiClient('https://api.example.com')
    await client.post('/users', { name: 'Bob' })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Bob' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('accepts request timeout option', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const { createApiClient } = await import('./api-client')
    const client = createApiClient('https://api.example.com', { timeout: 5000 })
    await client.get('/test')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npm run test -- src/lib/api-client.test.ts
```

预期：FAIL

- [ ] **Step 3: 创建 `src/lib/api-client.ts`**

```typescript
import { env } from '@/env'

export interface ApiClientOptions {
  timeout?: number
  headers?: Record<string, string>
}

export interface ApiError {
  message: string
  status: number
}

export class ApiRequestError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

async function request<T>(
  baseUrl: string,
  path: string,
  init: RequestInit,
  options: ApiClientOptions
): Promise<T> {
  const timeout = options.timeout ?? env.API_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const url = `${baseUrl}${path}`
  const headers: Record<string, string> = {
    ...options.headers,
    ...(init.headers as Record<string, string>),
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      let message = response.statusText
      try {
        const body = await response.json()
        if (body?.message) message = body.message
      } catch {}
      throw new ApiRequestError(message, response.status)
    }

    return response.json() as Promise<T>
  } finally {
    clearTimeout(timer)
  }
}

export interface ApiClient {
  get<T>(path: string, options?: ApiClientOptions): Promise<T>
  post<T>(path: string, body?: unknown, options?: ApiClientOptions): Promise<T>
  put<T>(path: string, body?: unknown, options?: ApiClientOptions): Promise<T>
  patch<T>(path: string, body?: unknown, options?: ApiClientOptions): Promise<T>
  delete<T>(path: string, options?: ApiClientOptions): Promise<T>
}

export function createApiClient(
  baseUrl: string,
  defaultOptions: ApiClientOptions = {}
): ApiClient {
  const opts = defaultOptions

  return {
    get: <T>(path: string, options: ApiClientOptions = {}) =>
      request<T>(baseUrl, path, { method: 'GET' }, { ...opts, ...options }),

    post: <T>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
      request<T>(
        baseUrl,
        path,
        {
          method: 'POST',
          body: body !== undefined ? JSON.stringify(body) : undefined,
          headers: { 'Content-Type': 'application/json' },
        },
        { ...opts, ...options }
      ),

    put: <T>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
      request<T>(
        baseUrl,
        path,
        {
          method: 'PUT',
          body: body !== undefined ? JSON.stringify(body) : undefined,
          headers: { 'Content-Type': 'application/json' },
        },
        { ...opts, ...options }
      ),

    patch: <T>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
      request<T>(
        baseUrl,
        path,
        {
          method: 'PATCH',
          body: body !== undefined ? JSON.stringify(body) : undefined,
          headers: { 'Content-Type': 'application/json' },
        },
        { ...opts, ...options }
      ),

    delete: <T>(path: string, options: ApiClientOptions = {}) =>
      request<T>(baseUrl, path, { method: 'DELETE' }, { ...opts, ...options }),
  }
}

// 全局默认实例，从 env 读取 base URL
export const apiClient = createApiClient(env.API_BASE_URL)
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npm run test -- src/lib/api-client.test.ts
```

预期：PASS（4 tests）

- [ ] **Step 5: 提交**

```bash
git add src/lib/api-client.ts src/lib/api-client.test.ts
git commit -m "feat: add type-safe HTTP API client with timeout and error handling"
```

---

## 子系统 F：CLI 参数解析

### Task 6：集成 tauri-plugin-cli

**Files:**

- Modify: `src-tauri/Cargo.toml`（添加 `tauri-plugin-cli`）
- Modify: `src-tauri/src/lib.rs`（注册 plugin，处理 CLI 参数）
- Modify: `src-tauri/tauri.conf.json`（声明 CLI 参数）

- [ ] **Step 1: 添加 Rust 依赖**

在 `src-tauri/Cargo.toml` 的 `[dependencies]` 中（desktop-only 条件编译区域）添加：

```toml
[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]
# （在已有的 desktop-only deps 下追加）
tauri-plugin-cli = "2"
```

- [ ] **Step 2: 在 tauri.conf.json 中声明 CLI 参数**

在 `src-tauri/tauri.conf.json` 的顶层添加 `"plugins"` 节点（如果不存在）或在已有 plugins 节点中添加 `"cli"` 配置：

```json
"plugins": {
  "cli": {
    "description": "A Tauri app built from tauri-template",
    "args": [
      {
        "name": "reset-config",
        "short": "r",
        "description": "Reset all preferences to defaults",
        "takesValue": false
      },
      {
        "name": "log-level",
        "short": "l",
        "description": "Set log level (error, warn, info, debug, trace)",
        "takesValue": true,
        "possibleValues": ["error", "warn", "info", "debug", "trace"]
      },
      {
        "name": "debug",
        "short": "d",
        "description": "Enable debug mode (shows DevTools on startup)",
        "takesValue": false
      }
    ]
  }
}
```

- [ ] **Step 3: 注册 plugin 并处理参数**

读取 `src-tauri/src/lib.rs`，在 setup 函数中 plugin 注册列表添加 `tauri_plugin_cli::init()`，并在 setup 返回前处理 CLI 参数。

在 plugin 注册区域（桌面端条件编译块内）添加：

```rust
.plugin(tauri_plugin_cli::init())
```

在 `setup` 函数中，在初始化逻辑之后添加 CLI 参数处理：

```rust
use tauri_plugin_cli::CliExt;

let cli_matches = app.cli().matches().unwrap_or_default();

// --reset-config: 删除 preferences.json，下次启动用默认值
if cli_matches.args.get("reset-config").map(|a| a.occurrences > 0).unwrap_or(false) {
    if let Ok(data_dir) = app.path().app_data_dir() {
        let prefs_path = data_dir.join("preferences.json");
        if prefs_path.exists() {
            let _ = std::fs::remove_file(&prefs_path);
            println!("Preferences reset to defaults.");
        }
    }
}

// --debug: 开启 DevTools（dev 模式已默认开启，release 模式通过 flag 打开）
if cli_matches.args.get("debug").map(|a| a.occurrences > 0).unwrap_or(false) {
    if let Some(window) = app.get_webview_window("main") {
        #[cfg(not(debug_assertions))]
        window.open_devtools();
    }
}

// --log-level: 动态调整日志级别（仅影响本次运行，可扩展为持久化）
if let Some(level_match) = cli_matches.args.get("log-level") {
    if let Some(level_str) = &level_match.value.as_str() {
        tracing::info!("Log level override requested: {level_str}");
        // 注意：tracing subscriber 在 setup 前初始化，此处记录意图供文档说明
        // 实际动态调整需在 logging.rs 中暴露 reload handle，属于进阶扩展
    }
}
```

- [ ] **Step 4: 编译验证**

```bash
cd src-tauri && cargo check 2>&1 | head -30
```

预期：无 error。

- [ ] **Step 5: 验证 CLI 参数在 help 中出现**

```bash
npm run tauri build -- --debug 2>&1 | tail -5
# 或直接测试
./src-tauri/target/debug/tauri-app --help 2>&1
```

预期：输出包含 `--reset-config`、`--log-level`、`--debug` 选项说明。

- [ ] **Step 6: 提交**

```bash
git add src-tauri/Cargo.toml src-tauri/src/lib.rs src-tauri/tauri.conf.json
git commit -m "feat: add CLI argument support (--reset-config, --debug, --log-level)"
```

---

## 子系统 G：通知管理

### Task 7：创建 useNotification hook 和通知设置

**Files:**

- Create: `src/hooks/use-notification.ts`
- Create: `src/hooks/use-notification.test.ts`
- Modify: `src/components/preferences/PreferencesDialog.tsx`（添加通知设置 UI）
- Modify: `src-tauri/src/types.rs`（AppPreferences 添加 `notifications_enabled`）
- Modify: `src-tauri/src/commands/preferences.rs`（更新验证逻辑）
- Modify: `locales/en.json`、`locales/zh.json`

- [ ] **Step 1: 更新 AppPreferences 添加通知开关**

读取 `src-tauri/src/types.rs`，在 `AppPreferences` struct 中添加字段：

```rust
pub struct AppPreferences {
    // ... 现有字段 ...
    #[serde(default = "default_notifications_enabled")]
    pub notifications_enabled: bool,
}

fn default_notifications_enabled() -> bool {
    true
}
```

同时更新 `Default` 实现（如果存在），添加 `notifications_enabled: true`。

- [ ] **Step 2: 编译验证**

```bash
cd src-tauri && cargo check 2>&1 | head -20
```

- [ ] **Step 3: 重新生成 bindings**

在 debug 构建运行时 bindings 会自动导出。手动触发：

```bash
cd src-tauri && cargo build 2>&1 | tail -5
```

`src/lib/bindings.ts` 中的 `AppPreferences` 类型现在应该包含 `notifications_enabled: boolean`。

- [ ] **Step 4: 更新 preferences.ts 的默认值**

读取 `src/services/preferences.ts`，在默认值对象（约第 26-33 行）中添加：

```typescript
notifications_enabled: true,
```

- [ ] **Step 5: 写 use-notification 的测试**

新建 `src/hooks/use-notification.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock Tauri commands
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    sendNativeNotification: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: null }),
    loadPreferences: vi.fn().mockResolvedValue({
      status: 'ok',
      data: {
        theme: 'system',
        color_scheme: 'supabase',
        glass_opacity: 0.72,
        notifications_enabled: true,
        quick_pane_shortcut: null,
        left_sidebar_shortcut: null,
        right_sidebar_shortcut: null,
        language: null,
      },
    }),
  },
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls sendNativeNotification when notifications are enabled', async () => {
    const { commands } = await import('@/lib/tauri-bindings')
    const { useNotification } = await import('./use-notification')

    const { result } = renderHook(() => useNotification())

    await act(async () => {
      await result.current.notify('Test Title', { native: true })
    })

    expect(commands.sendNativeNotification).toHaveBeenCalledWith(
      'Test Title',
      undefined
    )
  })

  it('falls back to toast when native notification fails', async () => {
    const { commands } = await import('@/lib/tauri-bindings')
    vi.mocked(commands.sendNativeNotification).mockRejectedValueOnce(
      new Error('Permission denied')
    )

    const { toast } = await import('sonner')
    const { useNotification } = await import('./use-notification')

    const { result } = renderHook(() => useNotification())

    await act(async () => {
      await result.current.notify('Test Title', { native: true })
    })

    expect(toast.info).toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: 运行测试，确认失败**

```bash
npm run test -- src/hooks/use-notification.test.ts
```

预期：FAIL，`cannot find module './use-notification'`

- [ ] **Step 7: 创建 `src/hooks/use-notification.ts`**

```typescript
import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification'
import { commands } from '@/lib/tauri-bindings'
import { logger } from '@/lib/logger'
import { usePreferences } from '@/services/preferences'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

export interface NotifyOptions {
  type?: NotificationType
  body?: string
  native?: boolean
  duration?: number
}

export function useNotification() {
  const { data: preferences } = usePreferences()
  const notificationsEnabled = preferences?.notifications_enabled ?? true

  const requestNativePermission = useCallback(async (): Promise<boolean> => {
    try {
      let granted = await isPermissionGranted()
      if (!granted) {
        const permission = await requestPermission()
        granted = permission === 'granted'
      }
      return granted
    } catch (e) {
      logger.warn('Failed to request notification permission', e)
      return false
    }
  }, [])

  const notify = useCallback(
    async (title: string, options: NotifyOptions = {}) => {
      const { type = 'info', body, native = false, duration } = options

      if (!notificationsEnabled) return

      if (native) {
        const hasPermission = await requestNativePermission()
        if (hasPermission) {
          try {
            await commands.sendNativeNotification(title, body)
            return
          } catch (e) {
            logger.warn('Native notification failed, falling back to toast', e)
          }
        }
      }

      // Toast fallback
      const toastOptions = { description: body, duration }
      switch (type) {
        case 'success':
          toast.success(title, toastOptions)
          break
        case 'error':
          toast.error(title, toastOptions)
          break
        case 'warning':
          toast.warning(title, toastOptions)
          break
        default:
          toast.info(title, toastOptions)
      }
    },
    [notificationsEnabled, requestNativePermission]
  )

  return { notify, notificationsEnabled }
}
```

- [ ] **Step 8: 运行测试，确认通过**

```bash
npm run test -- src/hooks/use-notification.test.ts
```

预期：PASS（2 tests）

- [ ] **Step 9: 在 Preferences 中添加通知设置**

读取 `src/components/preferences/PreferencesDialog.tsx`，找到 General 或 Advanced pane 的位置，添加通知开关。

具体位置在 `preferences/panes/` 目录（根据实际文件结构添加到 `GeneralPane.tsx` 或 `AdvancedPane.tsx`）：

```tsx
// 在通知设置区域添加
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label>{t('preferences.notifications.label')}</Label>
    <p className="text-muted-foreground text-xs">
      {t('preferences.notifications.description')}
    </p>
  </div>
  <Switch
    checked={preferences?.notifications_enabled ?? true}
    onCheckedChange={value =>
      savePreferences.mutate({ ...preferences!, notifications_enabled: value })
    }
  />
</div>
```

- [ ] **Step 10: 添加 i18n key**

`locales/en.json`（在 `preferences` 下）：

```json
"notifications": {
  "label": "Enable Notifications",
  "description": "Show native desktop notifications from the app."
}
```

`locales/zh.json`（在 `preferences` 下）：

```json
"notifications": {
  "label": "启用通知",
  "description": "允许应用显示桌面原生通知。"
}
```

- [ ] **Step 11: 运行全量测试**

```bash
npm run test
```

预期：所有测试 PASS

- [ ] **Step 12: 运行质量检查**

```bash
npm run check:all
```

预期：无 error（lint warnings 可接受，逐项修复）

- [ ] **Step 13: 提交**

```bash
git add src/hooks/use-notification.ts src/hooks/use-notification.test.ts src-tauri/src/types.rs src/services/preferences.ts src/components/preferences/ locales/
git commit -m "feat: add useNotification hook with permission management and preference toggle"
```

---

## 自检清单

### 规范覆盖检查

| 功能                          | 任务            | 状态 |
| ----------------------------- | --------------- | ---- |
| 环境变量 / Zod 校验           | Task 1          | ✅   |
| TanStack Router file-based    | Task 2          | ✅   |
| 认证路由守卫                  | Task 2 Step 6-8 | ✅   |
| react-hook-form + zod         | Task 3          | ✅   |
| 表单示例（form-demo 路由）    | Task 3 Step 7   | ✅   |
| SQLite migrations             | Task 4 Step 1-2 | ✅   |
| CRUD 示例（notes）            | Task 4 Step 3-8 | ✅   |
| HTTP API Client               | Task 5          | ✅   |
| CLI 参数（--reset-config 等） | Task 6          | ✅   |
| useNotification hook          | Task 7          | ✅   |
| 通知权限请求                  | Task 7 Step 7   | ✅   |
| 通知设置开关（Preferences）   | Task 7 Step 9   | ✅   |
| i18n 所有新 key               | 各 Task 末尾    | ✅   |

### 类型一致性检查

- `AppPreferences.notifications_enabled`：在 types.rs（Task 7 Step 1）、bindings.ts（自动生成）、preferences.ts 默认值（Task 7 Step 4）三处保持一致 ✅
- `Note` struct 字段名（snake_case Rust → camelCase TS bindings）：由 tauri-specta 自动处理 ✅
- `createApiClient` / `apiClient` 导出名：在 api-client.ts 和测试中一致 ✅
- `useZodForm` 导出：在 forms.ts 和 forms.test.ts 中一致 ✅
