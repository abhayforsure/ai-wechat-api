/*
 Navicat Premium Data Transfer

 Source Server         : glass
 Source Server Type    : MySQL
 Source Server Version : 80025 (8.0.25)
 Source Host           : 121.41.197.182:3306
 Source Schema         : ai_wechat

 Target Server Type    : MySQL
 Target Server Version : 80025 (8.0.25)
 File Encoding         : 65001

 Date: 02/09/2025 21:14:36
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for ai_admin
-- ----------------------------
DROP TABLE IF EXISTS `ai_admin`;
CREATE TABLE `ai_admin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(25) NOT NULL DEFAULT '',
  `password` varchar(255) NOT NULL DEFAULT '',
  `password_salt` varchar(255) NOT NULL DEFAULT '',
  `last_login_ip` varchar(60) NOT NULL DEFAULT '',
  `last_login_time` int NOT NULL DEFAULT '0',
  `is_delete` tinyint(1) DEFAULT '0',
  `type` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for ai_friends
-- ----------------------------
DROP TABLE IF EXISTS `ai_friends`;
CREATE TABLE `ai_friends` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_id` int DEFAULT NULL COMMENT '关联wechat_account表的ID',
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像',
  `nickname` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '昵称',
  `wxid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '属于谁的好友',
  `creaate_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `prompt` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '对AI的预置角色要求',
  `start_time` timestamp NULL DEFAULT NULL COMMENT '服务开始时间',
  `end_time` timestamp NULL DEFAULT NULL COMMENT '服务终止时间',
  `my_remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '称呼',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '昵称',
  `signature` mediumtext COLLATE utf8mb4_unicode_ci COMMENT '昵称',
  `province` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '昵称',
  `city` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '昵称',
  `country` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '昵称',
  `is_active` int NOT NULL DEFAULT '0' COMMENT '是否付费用户',
  `ai_active` int NOT NULL DEFAULT '0' COMMENT '是否允许AI处理消息',
  `user_story` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户需求',
  `role_id` int DEFAULT '1009' COMMENT '机器人',
  `mark` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '昵称',
  `ai_reply` int NOT NULL DEFAULT '0' COMMENT '是否允许AI回复消息',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8816 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for ai_friends_task
-- ----------------------------
DROP TABLE IF EXISTS `ai_friends_task`;
CREATE TABLE `ai_friends_task` (
  `id` int NOT NULL AUTO_INCREMENT,
  `friend_id` int NOT NULL COMMENT '关联friend得ID',
  `task_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cron_expression` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标准cron表达式',
  `execution_count` int DEFAULT '0' COMMENT '执行次数',
  `start_date` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务生效开始日期',
  `end_date` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务生效结束日期',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否激活',
  `next_execution_time` datetime DEFAULT NULL COMMENT '下次执行时间',
  `last_execution_time` datetime DEFAULT NULL COMMENT '上次执行时间',
  `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `require_content` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务要求',
  `message_content` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `task_content` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务内容',
  `cron_text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6532 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for ai_friends_task_record
-- ----------------------------
DROP TABLE IF EXISTS `ai_friends_task_record`;
CREATE TABLE `ai_friends_task_record` (
  `id` int NOT NULL AUTO_INCREMENT,
  `friend_id` int DEFAULT NULL,
  `task_name` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务名称',
  `result` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '完成结果',
  `summarize` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '总结',
  `suggestion` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '建议',
  `date` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日期',
  `create_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `score` int DEFAULT NULL COMMENT '得分',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for ai_logs
-- ----------------------------
DROP TABLE IF EXISTS `ai_logs`;
CREATE TABLE `ai_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '用户消息',
  `reson` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '推理过程',
  `msg` text COLLATE utf8mb4_unicode_ci COMMENT '全部消息',
  `reply` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '回复消息',
  PRIMARY KEY (`id`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_text_prefix` (`text`(100))
) ENGINE=InnoDB AUTO_INCREMENT=24038 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for ai_messages
-- ----------------------------
DROP TABLE IF EXISTS `ai_messages`;
CREATE TABLE `ai_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `from_user` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_user` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `msg_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'queued',
  `create_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '数据库时间',
  `update_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '数据库时间',
  `is_ai` tinyint DEFAULT '0' COMMENT '=1 是ai =0人工',
  `type` tinyint DEFAULT '0' COMMENT '=1：发送，=0接收',
  `msg_type` int DEFAULT NULL COMMENT '1 文字 3 图片 34 语音',
  `create_time` bigint DEFAULT NULL COMMENT '消息时间 微信端',
  `raw_data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '原始消息内容',
  PRIMARY KEY (`id`),
  KEY `idx_from_user` (`from_user`),
  KEY `idx_to_user` (`to_user`),
  KEY `idx_status` (`status`),
  KEY `idx_create_at` (`create_at`),
  KEY `idx_user_pair` (`from_user`,`to_user`),
  KEY `idx_time_status` (`create_at`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=113598 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for ai_roles
-- ----------------------------
DROP TABLE IF EXISTS `ai_roles`;
CREATE TABLE `ai_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '角色名称',
  `prompt` text COLLATE utf8mb4_unicode_ci COMMENT '此角色的prompt',
  `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_system` tinyint DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1012 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for ai_system
-- ----------------------------
DROP TABLE IF EXISTS `ai_system`;
CREATE TABLE `ai_system` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `desc` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for ai_task_logs
-- ----------------------------
DROP TABLE IF EXISTS `ai_task_logs`;
CREATE TABLE `ai_task_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int DEFAULT NULL,
  `task_name` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15941 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for ai_wechat_account
-- ----------------------------
DROP TABLE IF EXISTS `ai_wechat_account`;
CREATE TABLE `ai_wechat_account` (
  `id` int NOT NULL AUTO_INCREMENT,
  `auth_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备码',
  `wx_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '当前登录得微信id',
  `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '更新时间',
  `auth_key_remaining_time` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备码剩余时间',
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '微信头像',
  `nickname` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '微信昵称',
  `friend_count` bigint DEFAULT NULL COMMENT '好友数量',
  `onlineTime` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '本次在线',
  `totalOnline` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '累计在线',
  `onlineDays` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '在线天数',
  `expiryTime` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '过期时间',
  `loginErrMsg` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '在线状态描述',
  `alias` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '微信号',
  `ws_status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT 'WS连接状态',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
