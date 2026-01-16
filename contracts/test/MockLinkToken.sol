// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * 模拟 Link Token 合约用于测试
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract MockLinkToken {
    // 余额映射
    mapping(address => uint256) private s_balances;
    // 授权映射
    mapping(address => mapping(address => uint256)) private s_allowances;

    // 总供应量
    uint256 private s_totalSupply;

    // 事件
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // 铸造代币（用于测试）
    function mint(address to, uint256 amount) external {
        s_balances[to] += amount; // 增加余额
        s_totalSupply += amount; // 增加总供应量
        emit Transfer(address(0), to, amount); // 触发转账事件
    }

    // 查询余额
    function balanceOf(address account) external view returns (uint256) {
        return s_balances[account]; // 返回账户余额
    }

    // 授权
    function approve(address spender, uint256 amount) external returns (bool) {
        s_allowances[msg.sender][spender] = amount; // 设置授权额度
        emit Approval(msg.sender, spender, amount); // 触发授权事件
        return true; // 返回成功
    }

    // 查询授权额度
    function allowance(address owner, address spender) external view returns (uint256) {
        return s_allowances[owner][spender]; // 返回授权额度
    }

    // 转账
    function transfer(address to, uint256 amount) external returns (bool) {
        require(s_balances[msg.sender] >= amount, "Insufficient balance"); // 检查余额
        s_balances[msg.sender] -= amount; // 减少发送者余额
        s_balances[to] += amount; // 增加接收者余额
        emit Transfer(msg.sender, to, amount); // 触发转账事件
        return true; // 返回成功
    }

    // 从授权账户转账
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(s_balances[from] >= amount, "Insufficient balance"); // 检查余额
        require(s_allowances[from][msg.sender] >= amount, "Insufficient allowance"); // 检查授权
        s_balances[from] -= amount; // 减少发送者余额
        s_balances[to] += amount; // 增加接收者余额
        s_allowances[from][msg.sender] -= amount; // 减少授权额度
        emit Transfer(from, to, amount); // 触发转账事件
        return true; // 返回成功
    }

    // 查询总供应量
    function totalSupply() external view returns (uint256) {
        return s_totalSupply; // 返回总供应量
    }
}
