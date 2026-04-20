# Syncdown v2 Product Plan

项目名字叫作：Syncdown，没有中文名字。

## 1. 重做原则

- Syncdown v2 不是沿用旧版产品假设的小修小补，而是按新的产品逻辑重建。
- 文档以本计划为准；未写明的功能不要默认补充，需要单独确认。
- `owner` 和 `guest` 是相对于 workspace 的身份，不是用户的固定系统角色。
- 可以参考 Notion 的样式和交互质感，但不能擅自照搬未确认的功能结构。
- 整个应用需要保持统一的设计语言，避免局部组件风格跳脱。

## 2. 产品核心

Syncdown v2 的核心能力是：

- 富文本文档编辑
- 基于 workspace 的文档组织
- 基于分享的 guest 访问
- 文档级权限控制
- AI 操作
- 多人协作

技术栈：

- React.js
- PostgreSQL
- Tiptap
- Yjs
- Docker

当前实现策略补充：

- `DATABASE_URL` 未配置时，允许先用本地快照持久化
- `DATABASE_URL` 配置后，切换到 PostgreSQL 持久化
- 协作和多人光标基于 Yjs / awareness 实现，不再使用自写轮询 presence

## 3. Workspace 身份与权限

### 3.1 身份定义

- `owner`
  创建某个 workspace 的用户，就是该 workspace 的 owner。
- `guest`
  被某个 workspace 的 owner 通过文档分享带入该 workspace 的用户，就是该 workspace 的 guest。
- 同一个用户可以在一个 workspace 中是 owner，在另一个 workspace 中是 guest。

### 3.2 owner 身份

- workspace owner 创建和拥有该 workspace
- workspace owner 可以在该 workspace 中创建文档
- workspace owner 可以把该 workspace 中的文档分享给 guest
- workspace owner 可以设置 guest 对文档的权限
- workspace owner 才有该 workspace 的 `Trash` 功能
- 用户自己的 `name` 可以修改
- 用户自己的 `username` 不可变

### 3.3 guest 身份

- guest 通过文档分享进入某个 workspace
- guest 进入该 workspace 后，在 workspace 信息旁边显示 `guest`
- guest 只能看到该 workspace 中明确分享给自己的文档
- guest 不可以在该 workspace 中创建文档
- guest 可以看到该文档所有有权限用户的头像
- guest 不可以控制 workspace owner 的权限
- guest 可以导入和导出 Markdown
- 用户自己的 `name` 可以修改
- 用户自己的 `username` 不可变

### 3.4 文档权限级别

#### Can Edit

- edit
- suggest

#### Can View

- 仅查看
- 不可以 suggest

## 4. 登录与注册流程

首次进入网站就是登录页。

### 4.1 登录页

- 显示 username 输入框
- 显示密码输入框
- 底部显示 `New user? Sign up`
- 密码输入框下方显示 `Forget your password?`
- 点击 `Forget your password?` 后，提示用户：如果忘记密码，请联系管理员重置密码

补充规则：

- 登录失败时显示具体错误文案，例如 `Invalid username or password`

### 4.2 注册页

- 注册需要输入邮箱、用户名、名字、密码
- 邮箱不能为空
- 邮箱不能重复
- 邮箱不可以包含中文
- 邮箱保存前自动转成小写
- `username` 不能为空
- `username` 与 `name` 不同
- `username` 不可变
- `username` 不能重复
- `username` 不可以为中文
- `username` 只允许英文、数字、下划线
- `username` 保存前自动转成小写
- `username` 不区分大小写
- `name` 不能为空
- `name` 保存前自动去掉前后空格
- 密码不可以包含中文
- 密码最少 8 位
- 页面显示 `Existing user? Log in`
- 注册完成后，返回登录页

补充规则：

- 分享只允许发给已存在的用户
- 不允许邀请不存在的用户
- 注册失败时显示具体原因，例如邮箱已存在、username 已存在

## 5. Workspace 模型

- 每个用户在自己创建第一个 workspace 时，都会有一个默认 workspace
- 文档默认属于当前 workspace owner 的当前 workspace
- private 文档一旦被分享，就从 `Private` 区移动到 `Shared` 区
- guest 需要切换到被分享的 workspace，才能看到该 workspace 中分享给自己的文档
- guest 如果被分享进多个 workspace，可以在切换器里看到这些 workspace
- `Shared` 区只显示当前 workspace 的 shared 文档
- 当一个 shared 文档的所有 guest 都被移除后，该文档自动回到 `Private` 区
- 如果 guest 在某个 workspace 中已经没有任何可访问文档，则该 workspace 不再保留在切换器中
- 如果 guest 通过旧链接访问已无权限文档，显示没有权限，并自动回到 `Home`
- 客户端需要定时同步当前 workspace 和文档状态，不要求用户手动刷新页面
- 窗口重新获得焦点时，立即同步一次最新状态

workspace 规则：

- 默认 workspace 名字是 `Default`
- 创建 workspace 时只需要输入名字
- workspace 名字保存前自动去掉前后空格
- 同一 owner 下，workspace 名字不能重复
- workspace 可以改名
- workspace 可以删除
- 默认 workspace 也可以删除
- 创建 workspace 后，自动切换进入新 workspace
- 删除 workspace 时允许直接删除其中的文档和 guest 关系
- 删除前需要用户手动输入 workspace 名字确认
- 删除确认框中需要有明确的危险操作按钮，例如 `Delete workspace permanently`
- 删除确认时需要明确警告：删除 workspace 后，里面的内容都会消失
- 如果 guest 正停留在已删除 workspace，显示 `workspace 已被删除`
- workspace owner 修改 workspace 名字后，guest 立即看到新名字
- 删除 workspace 时，需要同时删除该 workspace 下的图片对象存储文件
- 删除当前 workspace 后，跳到 workspace 列表中的第一个 workspace
- 如果删除后已经没有任何 workspace，系统自动创建一个新的 `Default`

## 6. 整体界面结构

登录后进入应用主界面。

布局结构：

- 左侧固定边栏
- 右侧主内容区
- 左侧边栏和右侧主内容区独立滚动

## 7. 左侧边栏

### 7.1 顶部 workspace 信息框

显示内容：

- 用户头像
- 顶部卡片只显示当前 workspace 的头像和名称
- guest 视角在 workspace 名称右侧显示 `Guest` 标志
- `Guest` 标志使用偏暖黄的浅色胶囊样式
- 气泡、卡片、按钮默认沿用现有直角设计语言，不在局部单独引入圆角体系

点击后弹出一个紧挨着它的矩形气泡。

气泡内容：

- 当前 workspace 头部信息
- 设置按钮
- workspace 管理区域
- 当前所在 workspace
- 其他 workspaces
- 创建 workspace 按钮
- workspace 设置按钮
- logout 按钮

补充规则：

- 设置按钮进入当前用户自己的设置页
- `/settings` 页面必须真实存在，不做占位提示
- workspace 设置按钮用于管理当前 workspace
- 顶部气泡头部不显示当前用户的名字和 `@username`
- 顶部气泡不重复显示当前 workspace 头部
- workspace 列表中的 guest workspace 也要在名字右侧显示 `Guest` 标志
- 如果 workspace 列表过长，workspace 管理区域允许滚动
- 切换 workspace 后，右侧主区回到该 workspace 的 `Home`
- 顶部 workspace 主气泡右侧可以超出侧栏宽度
- 顶部 workspace 气泡中只保留 `Create workspace` 子气泡
- 所有气泡在点击气泡外部区域后都应关闭
- 气泡中的可点击按钮在悬浮时要加深颜色
- 顶部 workspace 主气泡展开时不能被 `Home` 行或其他侧栏卡片遮挡
- 没有文字说明的图标按钮在悬浮时应显示名称提示
- `Settings` 位于 `Log out` 上方

### 7.2 Home

- `Home` 按钮位于边栏上部
- 默认进入 `Home`

补充规则：

- guest 进入某个 workspace 后，默认先到 `Home`
- owner 在 `Home` 按钮右侧看到 `new document` 和 `workspace settings` 按钮
- guest 不显示 `new document` 和 `workspace settings`
- `workspace settings` 以子气泡形式从 `Home` 这一行的设置按钮右侧弹出
- `Home` 行的 `workspace settings` 子气泡展开时不能被顶部卡片或其他侧栏区域遮挡
- `Home` 行的 `workspace settings` 子气泡与设置按钮顶部对齐，不使用垂直居中展开

### 7.3 Recents 区

- 显示最近访问的文档
- 文档来源可包含 `Shared` 和 `Private`
- 文档以竖向文字列表形式展示

区头交互：

- 显示 `Recents`
- 悬浮时标题区域变深
- 有下箭头可收起
- 收起后有右箭头可展开
- 右侧有三个点按钮

三个点气泡内容：

- `# show`
- 悬浮到 `show` 后，弹出子气泡设置显示文档个数
- `move up`
- `move down`

补充说明：

- `Recents` 区不用排序
- 可以通过拖动区头调整 `Recents`、`Shared`、`Private` 三个区的顺序
- 如果左侧栏文档内容过长，可以滚动
- `Recents` 默认显示 10 个文档
- `# show` 可选：5 / 10 / 15 / 20
- `# show` 最多显示 20 个
- 超过当前显示数量的文档仍可通过滚动继续进入
- owner 点击 `Recents` 中的文档时，直接打开该文档
- guest 的 `Recents` 只会包含当前可访问的 shared 文档，点击后直接打开文档

### 7.4 Shared 区

- 显示当前 workspace 内的 shared 文档
- 文档以竖向文字列表形式展示

区头交互：

- 与 `Recents` 一样，支持收起和展开
- 有三个点按钮

三个点气泡内容：

- `# show`
- `move up`
- `move down`
- `Sort`

`Sort` 子气泡选项：

- `Manual`
- `Last edited`

补充规则：

- `Shared` 默认排序是 `Last edited`
- 如果没有文档，显示 `No pages inside`

### 7.5 Private 区

- 显示当前 workspace owner 创建、且当前仍为 private 的文档
- 如果 private 文档被分享给别人，它会自动移到 `Shared` 区
- 文档以竖向文字列表形式展示

区头交互：

- 与 `Shared` 一样
- 三个点右边有 `+` 按钮
- 点击 `+` 可以立即创建文档

补充规则：

- `Private` 默认排序是 `Last edited`
- guest 不显示 `Private` 区
- `# show` 默认显示 10 个文档
- `# show` 可选：5 / 10 / 15 / 20
- `# show` 最多显示 20 个
- 超过当前显示数量的文档仍可通过滚动继续进入
- 如果没有文档，显示 `No pages inside`

### 7.6 底部按钮

- `Trash`

补充规则：

- `Trash` 是 workspace 级功能
- `Trash` 只有当前 workspace owner 可用
- guest 看不到 `Trash`
- 侧栏底部的 `Trash` 按钮进入当前 workspace 的 `Trash` 页面
- 当前 workspace owner 可以恢复文档
- 当前 workspace owner 可以永久删除文档
- 永久删除文档前，需要弹出确认窗口
- `Trash` 页面中的删除按钮和删除确认按钮使用红色危险样式
- 恢复后的文档回到原来的 `Private` 或 `Shared` 状态
- `Trash` 中的文档不占用当前 workspace 的可用标题名额
- 如果恢复文档时标题与当前 workspace 中的活跃文档重名，系统自动生成一个可用标题
- 文档被删除后，通过原链接访问时显示 `已删除`
- `Trash` 中的文档只显示标题
- `Trash` 记录需要显示删除时间
- 如果 `Trash` 列表过长，列表区域内部滚动
- 只有当前 workspace owner 可以把文档移到 `Trash`

## 8. Home 页面

`Home` 是默认页面。

内容包括：

- 根据用户当地时间显示问候语，例如 `Good afternoon`
- 如果用户最近访问过文档，则显示 `recently visited`
- `recently visited` 下方以方块形式展示最近访问的文档，供快速进入

补充规则：

- `recently visited` 和侧边栏 `Recents` 使用同一份最近访问数据
- 两者只是在展示形式上不同
- 如果没有最近访问文档，`Home` 只显示问候语

## 9. 文档列表项交互

适用于 `Recents`、`Shared`、`Private` 中的文档项。

- 悬浮到文档名上时，文档项变深
- 右侧显示三个点按钮
- 点击三个点按钮，或直接右键，都可以打开文档操作气泡

文档操作气泡内容：

- rename
- trash
- 文档不可以跨 workspace
- 当前版本先不提供 `move to`

## 10. 文档页顶部区域

右侧文档区是编辑区。

- 编辑区顶部区域固定在主内容区顶部
- 滚动正文时，编辑区顶部不跟随滚动
- 编辑区顶部尽量简洁，不显示当前 workspace 名称、权限标签、当前块类型等冗余信息
- 顶部只保留必要的状态反馈，例如保存中、已保存、只读
- 保存状态紧贴标题右侧，并保留固定位置，避免状态变化导致顶部布局抖动
- 保存状态与标题按视觉中线对齐

创建文档时，可以直接输入文档名字。

补充规则：

- 新文档标题默认是空白
- 标题视觉层级要明显，但不能过大
- 标题字号保持克制，避免压过正文编辑区
- 如果用户最终没有输入标题，则自动命名为 `Untitled`、`Untitled1`、`Untitled2` ...
- 文档标题不允许为空
- `Untitled` 编号在当前 workspace 内唯一
- `Untitled` 编号只递增，不回收旧编号
- 同一个 workspace 内，文档标题不允许重复
- 文档标题保存前自动去掉前后空格
- 只有当前 workspace owner 可以修改文档标题
- 新建文档后，右侧立即打开该文档并进入编辑状态
- 新建文档时先进入标题编辑
- 新建空白文档后自动聚焦到标题输入框
- 标题编辑完成后，按回车进入正文编辑

右上角依次显示：

- 权限设置按钮
- 三个点按钮

### 10.1 权限按钮

如果文档仍然在 `Private`：

- 显示锁图标
- 显示 `Private`
- 点击后弹出权限气泡

权限气泡内容：

- 输入邮箱的输入框
- 邮箱输入框、权限选择、`share` 按钮保持在同一行
- 分享气泡需要足够宽，保证常见长度的邮箱和权限文字可以完整显示
- `share` 按钮
- 已被分享用户的信息列表

每个已分享用户信息显示：

- 头像
- 名字
- 邮箱
- 右侧权限按钮

权限按钮可设置：

- `can edit`
- `can view`
- `remove`

补充规则：

- 权限气泡中可以显示当前用户自己的权限级别
- 分享输入框一次只支持一个邮箱
- 如果邮箱过长，输入框保持单行并允许横向滚动查看
- 顶部权限按钮和权限下拉按钮都显示展开指示，并在展开时翻转方向
- 分享邮箱输入时自动转成小写再匹配用户
- 权限用户头像顺序中，workspace owner 永远第一个
- 其他用户按字母顺序排列
- 非 owner 只能查看当前访问列表和自己的权限
- workspace owner 不可以把自己从权限列表中移除
- 只有 workspace owner 可以新增 guest、修改 guest 权限、移除 guest
- workspace owner 可以在 `Can Edit` 和 `Can View` 之间切换 guest 权限
- `Can Edit` 不可以重命名文档标题
- `Can View` 不可以重命名文档
- `Can Edit` 可以 `import Markdown`
- `Can View` 不可以 `import Markdown`
- `Can View` 可以导出 Markdown
- 分享给自己时禁止提交
- 如果输入的用户已经有权限，显示 `This user already has access`
- 如果文档标题与当前 workspace 中已有标题重复，显示具体错误并阻止保存
- 最后一个 guest 被移除后，文档自动回到 `Private`

如果文档已经在 `Shared`：

- 按钮显示 `Shared`
- 按钮显示开锁图标
- 不在这个按钮里显示协作者头像

### 10.2 文档右上角三个点气泡

内容包括：

- 文档内容搜索框
- undo 按钮（`Ctrl+Z`）
- import
- export（Markdown 格式）

补充规则：

- 文档搜索交互类似浏览器 `Ctrl+F`
- 搜索入口使用文档页右上角的独立搜索按钮，不放在三点菜单里
- 搜索提供基础高亮和上下跳转
- 搜索结果计数或 `No match found` 提示固定显示在搜索气泡顶部右侧，避免挤动正文操作区
- 搜索框回车跳到下一个匹配
- 如果 `Next` 到末尾没有更多匹配，则回到第一个匹配
- 文档页搜索支持快捷键 `Ctrl+K`，再次按下会关闭搜索气泡
- 搜索气泡打开时，按 `Esc` 会关闭
- 全站可点击元素悬浮时统一显示手型光标
- `undo` 在没有可撤销历史时应显示为不可点击
- 文档页顶部的 `View only / Saving / Saved` 等状态使用小标签包裹
- 文档页顶部标题区和右侧操作按钮组应贴近左右边缘，只保留少量边距
- 文档页顶部仅保留 `Saving / Saved` 等保存状态标签
- owner 可从文档页右上角三点菜单将当前文档移到 `Trash`
- 文档从文档页移到 `Trash` 后，当前界面返回 `Home`
- `import Markdown` 在当前光标位置插入内容
- 导入支持单个 `.md` 文件和 `.zip` 文件
- 单个 `.md` 导入支持纯文本 Markdown
- 单个 `.md` 导入支持 `http/https` 图片链接
- 单个 `.md` 导入支持 `data:` 内嵌图片
- 单个 `.md` 导入暂不支持本地相对路径图片引用
- 单个 `.md` 导入大小上限为 `5MB`
- `.zip` 导入支持 `Markdown + assets` 结构
- `.zip` 导入时，可以解析 Markdown 中的相对路径图片并导入对象存储
- `.zip` 导入大小上限为 `20MB`
- 超出导入大小限制时，提示 `上传文件过大`
- 导出使用单一 `Export` 入口
- 文档不包含本地图片资源时，`Export` 自动导出 `.md`
- 文档包含本地图片资源时，`Export` 自动导出 `.zip`
- 导出的 `.zip` 包含 Markdown 文件和图片资源目录
- 导出后的 Markdown 使用相对路径引用图片资源
- `.zip` 导入按 Markdown 实际引用的资源做校验
- `.zip` 中只允许存在一个 Markdown 文件
- 如果 zip 内缺少被引用图片，或被引用资源不是受支持图片格式，则拒绝导入
- zip 中未被 Markdown 引用的多余文件也应拒绝导入
- `undo (Ctrl+Z)` 先按当前用户自己的编辑历史执行
- 图片块的 `download` 下载原图

## 11. 富文本编辑器

### 11.1 基础结构

- 最上方显示文档标题
- 标题下方是富文本内容区

补充规则：

- 文档标题修改和文档重命名是同一件事
- 标题变化后，侧栏文档名同步变化
- 标题和正文都自动保存
- guest 只能编辑正文，不能编辑标题

### 11.2 Slash 菜单

输入 `/` 后弹出矩形气泡，选项包括：

- Text
- Heading 1 (`#`)
- Heading 2 (`##`)
- Heading 3 (`###`)
- Heading 4 (`####`)
- Bulleted list (`-`)
- Numbered list (`1.`)
- Todo list (`[]`)
- Quote (`"`)
- Table
- Divider (`--`)
- Code (```)

补充规则：

- Slash 菜单字体和宽度保持克制，不要过大
- 如果插入点靠近编辑区底部，Slash 菜单自动向上展开，避免被主内容区底边挡住
- Slash 菜单过长时内部可滚动

### 11.3 文本选中气泡

选中文本后弹出气泡。

文本格式功能：

- H1
- H2
- H3
- Bold
- Italic
- Underline
- Add link
- Strike-through
- mark as code

AI 功能：

- Improve Writing
- Explain
- reformat
- summerize
- 自定义输入框
- 发送按钮

AI 交互规则：

- 点击 AI 功能后，关闭原本的文本气泡
- 打开 AI 气泡
- 当前版本在选中文本后显示一个选择气泡，提供基础格式化和 `AI` 入口
- 如果 AI 结果会替换或补充正文，需要用户确认
- `Explain` 和 `summerize` 只展示结果，不直接改正文
- `suggest` 是 AI 相关能力，不是单独的评论系统
- 当前版本先做 AI 交互和确认流程，并通过应用自己的后端接口发起 AI 请求
- AI 结果显示在气泡中
- 如果结果过长，气泡内使用可滚动文本框
- 前端不直接持有任何 AI key
- 前端只调用应用自己的 `/api/ai/action`
- 后端从环境变量读取 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`
- 如果本地未配置 AI 环境变量，当前版本直接提示 AI 服务未配置，不再回退到本地 mock 结果
- 可写类 AI 结果支持 `替换选区` 和 `插入下方`
- 自定义输入框发送后的结果也遵循“确认后应用”的规则
- 用户关闭 AI 气泡后，本次 AI 结果直接丢弃，不保留历史
- `Can View` 不显示 AI 功能入口

### 11.4 块级操作

鼠标悬浮到某个块上时，该块左边显示两个按钮：

- `+`
- 六个点按钮

`+` 按钮：

- 新建一个块
- 同时弹出 `/` 菜单
- 正文内容区要为左侧块操作预留足够空白，避免 `+` 和六个点与正文重叠
- 左侧块操作与正文之间保持适中距离，既不重叠，也不能远到难以点击
- 当前块左边的悬浮区也视为该块的一部分，鼠标移到左侧操作区时按钮不应消失

六个点按钮：

- 长按可以排序块
- 点击后弹出块设置气泡
- 块设置气泡优先显示在当前块左侧，避免遮挡正文
- 点击六个点后，相应的块底色变深
- 块设置气泡必须覆盖在侧栏之上显示，不能被侧栏挡住

块设置气泡内容：

- `Turn into`
- `Delete`
- `Duplicate`
- AI 功能

`Turn into` 用于把当前块转换成其他类型的块。
- `Turn into` 以右侧子菜单形式展开
- 鼠标悬浮到 `Turn into` 上时自动展开子菜单
- `Turn into` 子菜单要显示当前块的当前类型状态
- `Turn into` 子菜单不显示 `Divider`

### 11.5 多人编辑提示

- 如果多人同时编辑一个文档，正在编辑该块的人的头像显示在相应块左边
- 当鼠标悬浮在块上时，这些头像显示在 `+` 和六个点按钮的左边
- 多人可以同时编辑一个块
- 不显示对方的文字光标
- 默认情况下，协作者头像在原六点按钮位置再向左收一档，避免挡住正文
- 当块按钮出现时，头像、`+`、六个点按钮并排显示
- 同一块多人同时编辑时，最多显示两个头像，更多协作者显示为 `+N`

补充规则：

- 当前版本使用 Yjs 做正文协同
- 在线状态和块级协作者位置通过 awareness 同步
- 仍然不扩展到评论系统或更复杂的协作工作流

### 11.6 图片块

- 支持直接粘贴图片
- 支持从系统文件管理器拖动图片上传

图片块也有块级按钮。

点击图片块的六个点按钮后，弹出气泡，包含：

- `copy image`
- `download`
- `duplicate`
- `delete`

补充规则：

- 图片需要上传到对象存储
- 支持格式：`png` / `jpg` / `jpeg` / `webp` / `gif`
- 单张图片大小限制：`10MB`
- 超出限制或格式不支持时，显示错误提示且不上传
- `copy image` 复制图片本体到剪贴板
- `Can Edit` 可以上传和粘贴图片

## 12. 设置页面

### 12.1 Profile

- 设置头像
- 设置名字
- 修改密码
- `username` 不可修改

补充规则：

- 如果用户没有自定义头像，使用名字首字母作为默认头像
- 用户修改 `name` 后，默认头像字母立即更新
- 如果 `name` 是中文，默认头像显示该中文首字

### 12.2 Preferences

- 语言：中文 / English
- 主题：Dark / Light / System

补充规则：

- 默认语言是中文
- 默认主题是 `System`
- 语言切换需要覆盖整个应用
- 空状态文案需要跟随语言切换
- `Forget your password?` 对应提示文案需要跟随语言切换
- 所有 UI 文案都需要跟随语言切换

## 13. 当前不额外扩展

以下内容如果后面要做，需要单独确认，不默认加入当前计划：

- Toggle list
- 编辑单元格时蓝边高亮
- 新角色
- 新权限级别
- guest 创建文档
- guest 使用 Trash
- Shared 区跨 workspace 聚合
- 未明确写出的额外文档操作
- 未明确写出的 AI 功能和自动行为
- 当前版本之外的实时协同能力

## 14. 待确认问题

当前无待确认问题。
