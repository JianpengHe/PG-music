SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";
CREATE DATABASE IF NOT EXISTS `qq_music` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `qq_music`;

DELIMITER $$
DROP PROCEDURE IF EXISTS `创建下载列表`$$
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `创建下载列表` ()  NO SQL
BEGIN


UPDATE `media` SET `is_vip`=null,`down_mid`=null;

UPDATE (SELECT media_mid,min(is_vip) as need_vip FROM song WHERE disabled=0 GROUP BY media_mid)b INNER join media on media.media_mid=b.media_mid set media.is_vip=b.need_vip WHERE media.media_mid in (SELECT media_mid FROM song WHERE album_id in (SELECT albumID FROM album)) and (	size_96aac>0 or size_320mp3>0 or size_flac>0);


UPDATE (SELECT song.media_mid,mid FROM media INNER JOIN song on media.media_mid=song.media_mid WHERE media.is_vip=song.is_vip and song.disabled=0) a INNER JOIN media on a.media_mid=media.media_mid set media.down_mid=a.mid;

/*UPDATE (SELECT media_mid,is_vip,mid FROM song WHERE album_id in (SELECT albumID FROM album) ORDER BY is_vip ASC)b INNER join media on media.media_mid=b.media_mid set media.is_vip=b.is_vip,media.down_mid=b.mid;*/

TRUNCATE `download`;

INSERT INTO download SELECT CONCAT("C400",media_mid,".m4a"),down_mid,media_mid,size_96aac,is_vip,"","0000-00-00 00:00:00",null,null,null FROM `media` WHERE down_mid is not null and (disk_size_96aac is null AND (size_96aac !=0 or size_96aac!=disk_size_96aac));

INSERT INTO download SELECT CONCAT("M800",media_mid,".mp3"),down_mid,media_mid,size_320mp3,2,"","0000-00-00 00:00:00",null,null,null FROM `media` WHERE down_mid is not null and (disk_size_320mp3 is null AND (size_320mp3 !=0 or size_320mp3!=disk_size_320mp3));

INSERT INTO download SELECT CONCAT("F000",media_mid,".flac"),down_mid,media_mid,size_flac,2,"","0000-00-00 00:00:00",null,null,null FROM `media` WHERE down_mid is not null and (disk_size_flac is null AND (size_flac !=0 or size_flac!=disk_size_flac));


UPDATE (SELECT media_mid,group_concat(album_id) as album_ids FROM song WHERE media_mid in (SELECT media_mid FROM download) and album_id in (SELECT albumID FROM album) GROUP BY media_mid) a INNER JOIN download on a.media_mid=download.media_mid set download.album_ids=a.album_ids;

SELECT * FROM (SELECT * FROM (SELECT media_mid,avg(is_vip) as n FROM `song` WHERE 1 GROUP BY `media_mid` ) a WHERE n<1 and n>0) b INNER JOIN media on b.media_mid=media.media_mid ORDER BY `media`.`is_vip` DESC;
END$$

DROP PROCEDURE IF EXISTS `未下载数`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `未下载数` ()  NO SQL
BEGIN
UPDATE download set disk_size=null WHERE disk_size is not null and disk_size!=size;
SELECT COUNT(*) FROM `download` WHERE `url` IS NOT NULL AND `disk_size` IS NULL;
END$$

DROP PROCEDURE IF EXISTS `根据所有mid搜索歌曲`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `根据所有mid搜索歌曲` ()  NO SQL
UPDATE (SELECT group_concat(mid) as mids,media_mid FROM `song` WHERE media_mid in (SELECT media_mid FROM download) GROUP by media_mid)a INNER join download on a.media_mid=download.media_mid set download.down_mid=a.mids$$

DROP PROCEDURE IF EXISTS `统计`$$
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `统计` ()  NO SQL
SELECT * FROM (SELECT grp_from_song_id as id,COUNT(*) as num ,sum(comment_count) as total_comment_count FROM `song` GROUP by grp_from_song_id) a INNER JOIN song b on a.id=b.song_id  
ORDER BY `a`.`total_comment_count` DESC$$

DROP PROCEDURE IF EXISTS `统计应下载的大小`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `统计应下载的大小` ()  SELECT sum(size_96aac)/1024/1024/1024 as `acc大小(GB)`,sum(size_320mp3)/1024/1024/1024 as `mp3大小(GB)`,sum(size_flac)/1024/1024/1024 as `flac大小(GB)` FROM `media` WHERE is_vip is not null$$

DROP PROCEDURE IF EXISTS `统计未下载成功的歌曲`$$
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `统计未下载成功的歌曲` ()  SELECT mid,name,singer,copyright,disabled FROM `song` WHERE media_mid in(SELECT media_mid FROM download WHERE `down_mid` IS NULL) ORDER BY `song`.`disabled` ASC$$

DROP PROCEDURE IF EXISTS `选歌`$$
CREATE DEFINER=`root`@`127.0.0.1` PROCEDURE `选歌` ()  SELECT name,duration,mid,media_mid,total FROM (SELECT sum(comment_count) as total,count(*) as num,name,singer,CONCAT(max(comment_count)," - ",name," - ",singer) as k FROM song WHERE language=1 and comment_count>0 and singer in ("BEYOND", "侧田", "关正杰", "关淑怡", "刘德华", "古巨基", "叶蒨文", "吕方", "吴若希", "周华健", "周慧敏", "周柏豪", "容祖儿", "左麟右李", "张国荣", "张学友", "张敬轩", "张智霖", "徐小凤", "李克勤", "杜德伟", "杨千嬅", "林子祥", "林峯", "林忆莲", "梁咏琪", "梁汉文", "梅艳芳", "汪明荃", "洪卓立", "温兆伦", "温拿乐队", "王杰", "王祖蓝", "王菲", "甄妮", "罗文", "草蜢", "蔡国权", "许冠杰", "许廷铿", "许志安", "谢安琪", "谢霆锋", "谭咏麟", "邝美云", "邰正宵", "郑中基", "郑伊健", "郑秀文", "郭富城", "钟镇涛", "陈奕迅", "陈小春", "陈慧娴", "陈慧琳", "陈柏宇", "陈百强", "黄凯芹", "黎明") GROUP BY singer,name)a LEFT JOIN (SELECT mid,media_mid,duration,CONCAT(comment_count," - ",name," - ",singer) as k FROM song) b on a.k=b.k$$

DROP PROCEDURE IF EXISTS `需要下载的列表`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `需要下载的列表` ()  NO SQL
SELECT * FROM `media` WHERE down_mid is not null and ((disk_size_96aac is null AND size_96aac !=0) or (disk_size_320mp3 is null and size_320mp3 !=0) or (disk_size_flac is null and size_flac!=0))$$

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

DROP TABLE IF EXISTS `download`;
CREATE TABLE `download` (
  `file_name` varchar(32) NOT NULL,
  `down_mid` varchar(32) DEFAULT NULL,
  `media_mid` varchar(2048) DEFAULT NULL,
  `size` int(1) UNSIGNED DEFAULT NULL,
  `level` tinyint(1) UNSIGNED DEFAULT NULL COMMENT '0.未登录 1.免费试听 2.VIP用户',
  `album_ids` text,
  `expire` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `url` varchar(256) DEFAULT NULL,
  `thread_lock` int(1) UNSIGNED DEFAULT NULL,
  `disk_size` int(1) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `media`;
CREATE TABLE `media` (
  `media_mid` varchar(32) NOT NULL,
  `size_96aac` int(1) UNSIGNED DEFAULT NULL,
  `size_320mp3` int(1) UNSIGNED DEFAULT NULL,
  `size_flac` int(1) UNSIGNED DEFAULT NULL,
  `is_vip` tinyint(1) UNSIGNED DEFAULT NULL,
  `down_mid` varchar(32) DEFAULT NULL,
  `disk_size_96aac` int(1) DEFAULT NULL,
  `disk_size_320mp3` int(1) DEFAULT NULL,
  `disk_size_flac` int(1) DEFAULT NULL
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
  `singer` text,
  `album_id` int(1) UNSIGNED DEFAULT NULL,
  `index_album` tinyint(1) UNSIGNED DEFAULT NULL,
  `duration` smallint(1) UNSIGNED DEFAULT NULL,
  `language` tinyint(1) UNSIGNED DEFAULT NULL,
  `is_vip` tinyint(1) UNSIGNED DEFAULT NULL,
  `genre` tinyint(1) UNSIGNED DEFAULT NULL,
  `bpm` tinyint(1) UNSIGNED DEFAULT NULL,
  `time_public` date DEFAULT NULL,
  `media_mid` varchar(32) DEFAULT NULL,
  `tag` tinyint(1) UNSIGNED DEFAULT NULL,
  `grp_from_song_id` int(1) UNSIGNED DEFAULT NULL COMMENT '哪首歌的子版本',
  `comment_count` int(1) UNSIGNED DEFAULT NULL,
  `tid` int(1) UNSIGNED DEFAULT NULL,
  `disabled` tinyint(1) UNSIGNED DEFAULT NULL,
  `copyright` tinyint(1) UNSIGNED DEFAULT NULL,
  `action` text,
  `lyric` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


ALTER TABLE `album`
  ADD PRIMARY KEY (`albumID`),
  ADD UNIQUE KEY `album_mid` (`albumMid`);

ALTER TABLE `download`
  ADD PRIMARY KEY (`file_name`);

ALTER TABLE `media`
  ADD PRIMARY KEY (`media_mid`);

ALTER TABLE `singer`
  ADD PRIMARY KEY (`singer_id`),
  ADD UNIQUE KEY `singer_mid` (`singer_mid`);

ALTER TABLE `song`
  ADD PRIMARY KEY (`song_id`),
  ADD KEY `media_mid` (`media_mid`),
  ADD KEY `mid` (`mid`),
  ADD KEY `album_id` (`album_id`);
COMMIT;
