SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

CREATE DATABASE IF NOT EXISTS `qq_music` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `qq_music`;

DELIMITER $$
DROP PROCEDURE IF EXISTS `统计`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `统计` ()  NO SQL
SELECT * FROM (SELECT grp_from_song_id as id,COUNT(*) as num ,sum(comment_count) as total_comment_count FROM `song` GROUP by grp_from_song_id) a INNER JOIN song b on a.id=b.song_id  
ORDER BY `a`.`total_comment_count` DESC$$

DELIMITER ;

DROP TABLE IF EXISTS `album`;
CREATE TABLE `album` (
  `albumID` int(1) UNSIGNED NOT NULL,
  `albumMid` varchar(32) NOT NULL,
  `albumName` varchar(128) DEFAULT NULL,
  `albumType` varchar(64) DEFAULT NULL,
  `publishDate` date DEFAULT NULL,
  `genre` varchar(32) DEFAULT NULL,
  `company` varchar(128) DEFAULT NULL,
  `singer` text,
  `introduce` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `media`;
CREATE TABLE `media` (
  `media_mid` varchar(32) NOT NULL,
  `size_96aac` int(1) UNSIGNED DEFAULT NULL,
  `size_aac_file` int(1) UNSIGNED DEFAULT NULL,
  `size_320mp3` int(1) UNSIGNED DEFAULT NULL,
  `size_mp3_file` int(1) UNSIGNED DEFAULT NULL,
  `size_flac` int(1) UNSIGNED DEFAULT NULL,
  `size_flac_file` int(1) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `singer`;
CREATE TABLE `singer` (
  `singer_id` int(1) UNSIGNED NOT NULL DEFAULT '0',
  `singer_mid` varchar(32) DEFAULT NULL,
  `name` varchar(32) DEFAULT NULL,
  `foreign_name` varchar(128) DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `fans_count` int(1) UNSIGNED DEFAULT NULL,
  `song_conut` smallint(1) UNSIGNED DEFAULT NULL,
  `album_conut` smallint(1) UNSIGNED DEFAULT NULL,
  `search_conut` smallint(1) UNSIGNED DEFAULT NULL,
  `introduce` text,
  `wiki` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `song`;
CREATE TABLE `song` (
  `song_id` int(1) UNSIGNED NOT NULL,
  `mid` varchar(32) DEFAULT NULL,
  `name` varchar(256) DEFAULT NULL,
  `title` varchar(256) DEFAULT NULL,
  `subtitle` varchar(1024) DEFAULT NULL,
  `singers` varchar(1024) DEFAULT NULL,
  `album_id` int(1) UNSIGNED DEFAULT NULL,
  `index_album` tinyint(1) UNSIGNED DEFAULT NULL,
  `duration` smallint(1) UNSIGNED DEFAULT NULL,
  `language` tinyint(1) UNSIGNED DEFAULT NULL,
  `genre` tinyint(1) UNSIGNED DEFAULT NULL,
  `bpm` tinyint(1) UNSIGNED DEFAULT NULL,
  `time_public` date DEFAULT NULL,
  `media_mid` varchar(32) DEFAULT NULL,
  `tag` tinyint(1) UNSIGNED DEFAULT NULL,
  `grp_from_song_id` int(1) UNSIGNED DEFAULT NULL COMMENT '哪首歌的子版本',
  `comment_count` int(1) UNSIGNED DEFAULT NULL,
  `lyric` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


ALTER TABLE `album`
  ADD PRIMARY KEY (`albumID`),
  ADD UNIQUE KEY `album_mid` (`albumMid`);

ALTER TABLE `media`
  ADD PRIMARY KEY (`media_mid`);

ALTER TABLE `singer`
  ADD PRIMARY KEY (`singer_id`),
  ADD UNIQUE KEY `singer_mid` (`singer_mid`);

ALTER TABLE `song`
  ADD PRIMARY KEY (`song_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
