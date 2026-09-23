-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: authservice
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
-- Table structure for table `point_histories`
--

DROP TABLE IF EXISTS `point_histories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `point_histories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `order_code` varchar(255) DEFAULT NULL,
  `points` int NOT NULL,
  `reason` varchar(255) NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `point_histories`
--

LOCK TABLES `point_histories` WRITE;
/*!40000 ALTER TABLE `point_histories` DISABLE KEYS */;
INSERT INTO `point_histories` VALUES (1,'2026-09-05 12:37:22.206606','TN260905273E',6179,'Tích điểm từ đơn hàng TN260905273E (Điểm gốc: 6179)',23),(2,'2026-09-05 15:54:57.680796','Tặng quà',1100,'Tích điểm từ đơn hàng Tặng quà (Điểm gốc: 1000)',23),(3,'2026-09-05 16:00:35.639605','MANUAL_ADJUST',-1100,'rút lại quà',23),(4,'2026-09-05 16:01:34.206674','MANUAL_ADJUST',1000,'Tặng quà',23),(5,'2026-09-06 22:47:41.582398','MANUAL_ADJUST',-1000,'Đổi mã giảm giá từ Cửa hàng Đổi Điểm',23),(6,'2026-09-06 22:50:42.519974','MANUAL_ADJUST',1000,'hoàn lại điểm đổi',23),(7,'2026-09-06 22:56:19.192068','MANUAL_OR_REDEEM',-1000,'Đổi mã giảm giá từ Cửa hàng Đổi Điểm',23),(8,'2026-09-06 23:29:37.827870','MANUAL_OR_REDEEM',-500,'Đổi mã giảm giá từ Cửa hàng Đổi Điểm',19),(9,'2026-09-06 23:38:10.369271','MANUAL_OR_REDEEM',7000,'tặng điểm',19),(10,'2026-09-06 23:38:35.443462','MANUAL_OR_REDEEM',-500,'Đổi mã giảm giá từ Cửa hàng Đổi Điểm',19),(11,'2026-09-07 01:40:39.323025','MANUAL_OR_REDEEM',-500,'Đổi mã giảm giá từ Cửa hàng Đổi Điểm',19),(12,'2026-09-07 01:46:12.817368','MANUAL_OR_REDEEM',-100,'Đổi mã giảm giá từ Cửa hàng Đổi Điểm',19),(13,'2026-09-07 01:46:44.457516','MANUAL_OR_REDEEM',-500,'Đổi mã giảm giá từ Cửa hàng Đổi Điểm',19),(14,'2026-09-07 02:13:54.012313','MANUAL_OR_REDEEM',-100,'Đổi mã giảm giá từ Cửa hàng Đổi Điểm',23),(15,'2026-09-07 18:07:12.948536','TN260907XQ2L',14938,'Tích điểm từ đơn hàng TN260907XQ2L (Điểm gốc: 12448)',23),(16,'2026-09-07 23:03:05.963425','TN260907XSVU',14209,'Tích điểm từ đơn hàng TN260907XSVU (Điểm gốc: 11841)',23),(17,'2026-09-10 19:38:38.783877','MANUAL_OR_REDEEM',100,'22',27),(18,'2026-09-10 19:40:33.605637','MANUAL_OR_REDEEM',-50,'e',27),(19,'2026-09-11 14:37:28.406563','MANUAL_OR_REDEEM',-3000,'Trừ điểm',19),(20,'2026-09-11 14:57:17.072312','MANUAL_OR_REDEEM',1000,'Tặng',26),(21,'2026-09-11 14:57:26.179635','MANUAL_OR_REDEEM',-100,'Đổi mã giảm giá từ Cửa hàng Đổi Điểm',26),(22,'2026-09-22 16:38:06.989532','TN260922MDCX',1,'Tích điểm từ đơn hàng TN260922MDCX (Điểm gốc: 1)',23);
/*!40000 ALTER TABLE `point_histories` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-23 22:32:42
