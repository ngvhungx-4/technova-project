-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: cartservice
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `total_amount` decimal(38,2) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `session_id` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=242 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carts`
--

LOCK TABLES `carts` WRITE;
/*!40000 ALTER TABLE `carts` DISABLE KEYS */;
INSERT INTO `carts` VALUES (106,1,0.00,'2026-03-05 01:30:51',NULL),(107,9,83980000.00,'2026-02-22 10:59:45',NULL),(108,2,0.00,'2026-02-24 11:07:20',NULL),(109,11,0.00,'2026-03-04 01:16:42',NULL),(110,12,64390374.00,'2026-08-10 03:03:09',NULL),(111,18,3712015662.00,'2026-08-30 00:34:19',NULL),(112,NULL,0.00,'2026-08-15 03:50:06','guest_422qvtww5bz'),(113,19,7358277.00,'2026-09-22 13:01:55',NULL),(114,NULL,0.00,'2026-08-15 03:57:30','guest_mqjia1tilo'),(115,NULL,30655404.00,'2026-08-15 04:53:09','guest_dss1u8tzdu'),(116,NULL,29773376.00,'2026-08-15 04:36:57','guest_fl8ruisxrm'),(117,NULL,0.00,'2026-08-15 04:37:42','guest_frmbsq7ctba'),(118,NULL,10000.00,'2026-08-17 03:23:12','guest_z136acgnxqk'),(119,NULL,10000.00,'2026-08-17 03:25:46','guest_0wc46o0q6h4'),(120,NULL,0.00,'2026-08-17 04:01:35','guest_ur661z9rf2'),(121,NULL,0.00,'2026-08-17 04:30:58','guest_ba0dd3bmc6q'),(122,NULL,0.00,'2026-08-19 00:37:08','guest_oh4ntu8mscp'),(123,NULL,0.00,'2026-08-20 00:26:40','guest_bk9lwm62nm'),(124,NULL,10000.00,'2026-08-20 00:33:23','guest_s1utcytr5vr'),(125,NULL,2000.00,'2026-08-20 04:34:04','guest_a7q5wnpwoik'),(126,NULL,12000.00,'2026-08-20 04:35:22','guest_4muhfz2vo2d'),(127,NULL,0.00,'2026-08-20 05:09:48','guest_74k6bk2nb1h'),(128,NULL,0.00,'2026-08-20 06:15:09','guest_3mkx3ic5c2s'),(129,NULL,40000.00,'2026-08-20 06:26:04','guest_1l96u44hap1'),(130,NULL,0.00,'2026-08-22 04:26:20','guest_noh5jvxg8u'),(131,NULL,86815404.00,'2026-08-26 01:39:13','guest_sto61sgvjvi'),(132,NULL,0.00,'2026-08-27 01:07:33','guest_a8a2lskthmt'),(133,NULL,0.00,'2026-08-27 01:11:41','guest_5fvib056ys'),(134,NULL,0.00,'2026-08-27 01:13:54','guest_e5ayihhyja9'),(135,NULL,0.00,'2026-08-27 01:38:46','guest_j5uhyvcr5zp'),(136,NULL,0.00,'2026-08-27 01:49:32','guest_bz1to9vywhj'),(137,NULL,0.00,'2026-08-27 02:07:27','guest_ez789izzy4l'),(138,NULL,0.00,'2026-08-27 02:12:41','guest_zq4uk69qkcp'),(139,NULL,0.00,'2026-08-27 03:32:15','guest_tni0n4piez'),(140,NULL,0.00,'2026-08-27 04:14:05','guest_74r7mfmpb5q'),(141,NULL,0.00,'2026-08-28 02:04:05','guest_quhezz09wgp'),(142,NULL,0.00,'2026-08-28 02:04:54','guest_fwwsl55uty'),(143,NULL,0.00,'2026-08-28 06:14:39','guest_b47icks7ttj'),(144,NULL,0.00,'2026-08-29 02:17:34','guest_gwcfk7ehuwp'),(145,NULL,0.00,'2026-08-29 02:28:43','guest_ek9l9yv0k6e'),(146,NULL,0.00,'2026-08-29 03:27:02','guest_aql60evvciv'),(147,NULL,0.00,'2026-08-29 03:32:23','guest_oi8q93d5us'),(148,NULL,0.00,'2026-08-29 03:45:21','guest_9dvbjfswsx7'),(149,NULL,0.00,'2026-08-29 03:58:31','guest_uwzznd1qj8p'),(150,NULL,0.00,'2026-08-29 04:10:11','guest_ltyu5ihnqyi'),(151,NULL,0.00,'2026-08-29 04:17:53','guest_jy4re8j3ez8'),(152,NULL,0.00,'2026-08-29 05:02:04','guest_l7eqzarj0wa'),(153,NULL,7396595.00,'2026-08-29 07:35:13','guest_g5kirllu794'),(154,NULL,569537815.00,'2026-08-29 07:44:29','guest_9nkhkwgabga'),(155,NULL,0.00,'2026-08-29 08:45:17','guest_b37dsl2x5nu'),(156,NULL,7396595.00,'2026-08-29 09:05:02','guest_u29vqk2hldn'),(157,NULL,0.00,'2026-08-29 09:06:12','guest_915rkq4iks'),(158,NULL,569537815.00,'2026-08-29 09:09:01','guest_89h0usv90xj'),(159,NULL,0.00,'2026-08-30 00:17:35','guest_4q9psuazzqt'),(160,NULL,0.00,'2026-08-30 02:29:20','guest_56nor5pm33a'),(161,NULL,0.00,'2026-08-30 03:19:30','guest_ke8x9dy81gr'),(162,NULL,7396595.00,'2026-08-30 03:21:46','guest_bbudvjf4t4'),(163,NULL,569537815.00,'2026-08-30 03:41:20','guest_kcs7o7lnkg'),(164,NULL,0.00,'2026-08-30 06:15:43','guest_ctwnkycs1jb'),(165,NULL,91966212.00,'2026-08-30 10:30:25','guest_dh7yepr9uf'),(166,NULL,0.00,'2026-08-31 00:13:30','guest_7dpcmetls2v'),(167,NULL,0.00,'2026-08-31 06:11:49','guest_zibv4j5738d'),(168,NULL,0.00,'2026-08-31 06:18:33','guest_oj5111hptna'),(169,NULL,0.00,'2026-08-31 06:26:26','guest_m50zl654ncl'),(170,21,1855914093.00,'2026-08-31 08:17:40',NULL),(171,NULL,0.00,'2026-08-31 07:19:15','guest_y5y7nxozgn'),(172,NULL,0.00,'2026-08-31 08:27:03','guest_ynkwbhippjq'),(173,NULL,0.00,'2026-08-31 11:20:08','guest_eik831zfwul'),(174,NULL,0.00,'2026-09-01 00:09:39','guest_u9yej8146d'),(175,NULL,0.00,'2026-09-01 06:07:26','guest_x40s3m5kvdd'),(176,NULL,0.00,'2026-09-01 06:16:22','guest_2jc1b636xzo'),(177,NULL,0.00,'2026-09-01 07:07:37','guest_dq35c6ozqx6'),(178,NULL,0.00,'2026-09-01 07:23:35','guest_a2pwfixh50c'),(179,NULL,0.00,'2026-09-02 16:11:44','guest_8010uaozugf'),(180,NULL,22490000.00,'2026-09-02 22:03:39','guest_ywrrmzp0tth'),(182,NULL,0.00,'2026-09-02 23:36:26','guest_2hlywxf54z9'),(183,NULL,0.00,'2026-09-02 23:37:19','guest_pvyz9pio79'),(184,22,10000.00,'2026-09-03 01:07:59',NULL),(185,NULL,19690000.00,'2026-09-03 10:00:27','guest_9n6kirg23g'),(186,NULL,0.00,'2026-09-03 11:59:38','guest_uf9anv5w8kq'),(187,23,73990000.00,'2026-09-23 11:03:45',NULL),(188,NULL,0.00,'2026-09-04 08:41:13','guest_nn851ic5p09'),(189,NULL,0.00,'2026-09-04 09:33:08','guest_vj4t8j7lci'),(190,NULL,0.00,'2026-09-04 18:26:06','guest_d6tmvh69rho'),(191,NULL,0.00,'2026-09-05 05:36:03','guest_aqg14prcqb4'),(192,NULL,0.00,'2026-09-05 08:11:45','guest_qhs4sozwszo'),(193,25,0.00,'2026-09-05 08:34:12',NULL),(194,NULL,0.00,'2026-09-05 10:48:28','guest_3awhph8uh7a'),(195,NULL,0.00,'2026-09-06 09:34:35','guest_3pvstaeck38'),(196,NULL,0.00,'2026-09-06 09:57:58','guest_qdrhngeyvt'),(197,NULL,0.00,'2026-09-06 14:11:42','guest_93sgi4mb9gw'),(198,NULL,42115243.00,'2026-09-06 14:26:54','guest_vrat61xf8e'),(199,26,18000.00,'2026-09-22 13:01:55',NULL),(200,NULL,7396595.00,'2026-09-06 15:21:48','guest_2v1nvferxw7'),(201,NULL,7396595.00,'2026-09-06 19:06:41','guest_jo29256mbjp'),(202,NULL,0.00,'2026-09-07 06:31:08','guest_n7cs081s5rf'),(203,NULL,0.00,'2026-09-07 06:45:27','guest_s6791yyx6tm'),(204,NULL,72770647.00,'2026-09-07 16:00:29','guest_vxib9cttqc'),(205,NULL,0.00,'2026-09-07 16:04:34','guest_wdsdi16uidl'),(206,NULL,0.00,'2026-09-08 07:40:51','guest_x18zp9jwxf'),(207,NULL,14793190.00,'2026-09-10 10:05:42','guest_tfg5msgi8js'),(208,NULL,0.00,'2026-09-10 11:29:10','guest_451738f3zg2'),(209,27,0.00,'2026-09-10 11:32:31',NULL),(210,NULL,0.00,'2026-09-10 11:32:54','guest_wqzmhsuk73s'),(211,NULL,0.00,'2026-09-11 07:41:03','guest_nxl65sxo17o'),(212,NULL,0.00,'2026-09-12 03:45:17','guest_02v737psgbvo'),(213,NULL,0.00,'2026-09-12 03:53:46','guest_2wn24vmioon'),(214,28,1000000.00,'2026-09-12 04:11:40',NULL),(215,NULL,0.00,'2026-09-14 07:36:24','guest_zcss9vulffm'),(216,NULL,0.00,'2026-09-14 10:51:41','guest_tztal51vafj'),(217,NULL,0.00,'2026-09-14 11:08:06','guest_lwto1msl5y'),(218,NULL,0.00,'2026-09-14 16:04:38','guest_if3waatxdv'),(219,NULL,0.00,'2026-09-15 06:56:48','guest_qgbhqtt06m8'),(220,NULL,0.00,'2026-09-15 09:44:09','guest_any59ftv2bg'),(221,NULL,0.00,'2026-09-15 10:05:05','guest_p4hbtycetkj'),(222,NULL,0.00,'2026-09-15 10:06:21','guest_3l738dv1xxh'),(223,NULL,494802788.00,'2026-09-15 11:24:27','guest_7q45uz9lw6n'),(224,NULL,0.00,'2026-09-15 12:45:16','guest_4g3lm9msxso'),(225,NULL,0.00,'2026-09-16 05:30:51','guest_je3ivuzg7ms'),(226,NULL,0.00,'2026-09-16 05:55:32','guest_ti36jbw00np'),(227,NULL,0.00,'2026-09-16 05:55:57','guest_s6r249fk1w8'),(228,NULL,0.00,'2026-09-16 08:35:41','guest_xj0n3zpjuym'),(229,NULL,172480000.00,'2026-09-17 09:59:42','guest_mbkh3wj6iso'),(230,NULL,513000.00,'2026-09-17 10:29:49','guest_p90wxvii3dn'),(231,NULL,0.00,'2026-09-22 07:14:58','guest_6pmsz4wvu6y'),(232,NULL,22000.00,'2026-09-22 07:30:02','guest_xuot3i108g'),(233,NULL,18000.00,'2026-09-22 09:39:46','guest_6xd64txrdhw'),(234,NULL,0.00,'2026-09-22 09:41:34','guest_ncyfks0mwz'),(235,NULL,18000.00,'2026-09-22 12:18:11','guest_egew2d02x2b'),(236,NULL,0.00,'2026-09-22 12:21:15','guest_4enc6bsi77g'),(237,NULL,0.00,'2026-09-22 12:42:48','guest_cvog9tq39st'),(238,NULL,0.00,'2026-09-22 12:47:23','guest_cwu1agavkgj'),(239,NULL,117480000.00,'2026-09-23 10:59:25','guest_oaxcrf5kzg'),(240,NULL,0.00,'2026-09-23 11:14:41','guest_xkwh4lneki'),(241,NULL,76990000.00,'2026-09-23 14:11:46','guest_ze0cxbynh3b');
/*!40000 ALTER TABLE `carts` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-23 22:32:44
