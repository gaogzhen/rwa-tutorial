# 设置 Avalanche Fuji 测试网私钥

本文档说明如何正确设置 Avalanche Fuji 测试网的私钥格式。

## 私钥格式要求

Avalanche Fuji 测试网的私钥必须符合以下格式：

1. **十六进制字符串**
   - 必须以 `0x` 开头
   - 总长度为 66 个字符（`0x` + 64 个十六进制字符）
   - 例如：`0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

2. **不带 0x 前缀的格式**（会自动添加）
   - 64 个十六进制字符
   - 例如：`1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

## 设置方式

### 方式 1: 使用 Hardhat Keystore（推荐）

```bash
# 设置私钥（会自动处理格式）
npx hardhat keystore set AVALANCHE_FUJI_PRIVATE_KEY
```

输入私钥时：
- **推荐**：输入带 `0x` 前缀的完整私钥（66 个字符）
  - 例如：`0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
- **也可以**：输入不带 `0x` 的 64 个字符的十六进制字符串
  - 例如：`1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
  - Hardhat 会自动添加 `0x` 前缀

**重要**：确保私钥格式正确，否则会出现 `Expected a hex-encoded private key` 错误

### 方式 2: 使用环境变量

```bash
# 方式 A: 带 0x 前缀
export AVALANCHE_FUJI_PRIVATE_KEY="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

# 方式 B: 不带 0x 前缀（配置会自动添加）
export AVALANCHE_FUJI_PRIVATE_KEY="1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
```

### 方式 3: 在 .env 文件中设置

创建或编辑 `.env` 文件：

```bash
# .env 文件
AVALANCHE_FUJI_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

然后在 `hardhat.config.ts` 中使用 `dotenv` 加载（需要安装 `dotenv` 包）。

## 验证私钥格式

### 检查私钥长度

```bash
# 如果使用环境变量
echo ${AVALANCHE_FUJI_PRIVATE_KEY} | wc -c
# 应该输出 67（66 个字符 + 换行符）

# 或者检查是否以 0x 开头
echo ${AVALANCHE_FUJI_PRIVATE_KEY} | grep -q "^0x" && echo "格式正确" || echo "格式错误"
```

### 使用 Node.js 验证

```javascript
const privateKey = process.env.AVALANCHE_FUJI_PRIVATE_KEY;
if (!privateKey) {
  console.error("私钥未设置");
} else if (privateKey.startsWith("0x") && privateKey.length === 66) {
  console.log("✅ 私钥格式正确");
} else if (!privateKey.startsWith("0x") && privateKey.length === 64) {
  console.log("✅ 私钥格式正确（会自动添加 0x）");
} else {
  console.error("❌ 私钥格式错误");
  console.error(`   长度: ${privateKey.length}`);
  console.error(`   是否以 0x 开头: ${privateKey.startsWith("0x")}`);
}
```

## 常见错误

### 错误 1: `Expected a hex-encoded private key or a Configuration Variable`

**原因**：配置中使用了函数调用而不是直接使用 `configVariable()`

**解决方案**：
1. 确保 `hardhat.config.ts` 中直接使用 `configVariable("AVALANCHE_FUJI_PRIVATE_KEY")`
2. 不要使用函数调用或表达式处理私钥
3. 确保私钥在 Keystore 或环境变量中的格式正确

### 错误 2: `invalid private key, expected hex or 32 bytes, got object`

**原因**：`configVariable` 返回了对象而不是字符串

**解决方案**：
1. 确保使用 Hardhat Keystore 设置私钥
2. 或者确保环境变量是字符串格式
3. 重新设置私钥：`npx hardhat keystore set AVALANCHE_FUJI_PRIVATE_KEY`

### 错误 3: `invalid private key, expected hex or 32 bytes`

**原因**：私钥格式不正确

**解决方案**：
1. 检查私钥长度（应该是 66 或 64 个字符）
2. 确保只包含十六进制字符（0-9, a-f, A-F）
3. 如果使用环境变量，确保没有额外的空格或换行符
4. 使用 `echo -n` 避免换行符：`echo -n "0x..." | npx hardhat keystore set AVALANCHE_FUJI_PRIVATE_KEY`

### 错误 4: 私钥长度不正确

**原因**：私钥应该是 64 个十六进制字符（或 66 个字符，包括 0x 前缀）

**解决方案**：
- 检查私钥是否完整
- 确保没有截断或多余字符
- 使用 `echo -n` 避免换行符

## 安全提示

⚠️ **重要安全提示**：

1. **永远不要提交私钥到 Git**
   - 确保 `.env` 文件在 `.gitignore` 中
   - 不要将私钥提交到版本控制系统

2. **使用测试网私钥**
   - 只使用测试网账户的私钥
   - 主网私钥必须严格保密

3. **定期轮换**
   - 如果私钥泄露，立即更换
   - 不要在多个项目中使用同一个私钥

4. **使用环境变量或 Keystore**
   - 不要在代码中硬编码私钥
   - 使用 Hardhat Keystore 或环境变量

## 获取测试网私钥

### 从 MetaMask 导出

1. 打开 MetaMask
2. 选择测试网账户
3. 点击账户详情
4. 选择"导出私钥"
5. 输入密码确认
6. 复制私钥（64 个字符，不带 0x）

### 生成新的测试账户

```bash
# 使用 Node.js 生成
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

## 测试配置

设置完成后，测试配置是否正确：

```bash
# 编译合约（会验证配置）
npx hardhat compile

# 尝试连接到网络（会验证私钥）
npx hardhat run scripts/test-real-estate-token.ts --network avalancheFuji
```

## 参考

- [Hardhat Keystore 文档](https://hardhat.org/hardhat-runner/docs/guides/keystore)
- [Avalanche Fuji 测试网](https://docs.avax.network/build/avalanchego-apis/avalanche)
- [SETUP_PRIVATE_KEY.md](./SETUP_PRIVATE_KEY.md) - 通用私钥设置指南
