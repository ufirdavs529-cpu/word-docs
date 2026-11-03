-- ===================================================================
-- MICROSOFT WORD MYSQL DATABASE SCHEMA
-- Baza nomi: word_db
-- ===================================================================

CREATE DATABASE IF NOT EXISTS `word_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `word_db`;

CREATE TABLE IF NOT EXISTS `documents` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL DEFAULT 'Yangi Hujjat',
  `content` LONGTEXT,
  `settings` JSON,
  `word_count` INT UNSIGNED DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `document_revisions` (
  `revision_id` INT AUTO_INCREMENT PRIMARY KEY,
  `document_id` VARCHAR(64) NOT NULL,
  `content` LONGTEXT,
  `saved_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Boshlang'ich namuna hujjat
INSERT INTO `documents` (`id`, `title`, `content`, `settings`, `word_count`)
VALUES (
  'doc-default',
  'Hujjat 1 - MySQL Baza Namunasi',
  '<h1 style="color: #2b579a;">Microsoft Word - MySQL Backend</h1><p>Ushbu hujjat MySQL ma\'lumotlar bazasida saqlanadi.</p>',
  '{"orientation": "portrait", "pageSize": "a4", "margins": "normal", "pageColor": "#ffffff", "watermark": ""}',
  14
) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);
