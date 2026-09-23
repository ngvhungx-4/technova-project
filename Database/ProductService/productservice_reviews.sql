-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: productservice
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
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment` varchar(1000) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `rating` int NOT NULL,
  `reviewer_avatar` varchar(500) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `reviewer_name` varchar(255) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (2,'sản phẩm tốt','2026-02-22 19:05:17.604929',14,555,4,'http://localhost:8081/uploads/avatar_df36ed58-67d1-4060-b9c7-d0206f52d166_Screenshot 2026-01-01 162639.png','niooo',9),(3,'ĐEP','2026-02-23 17:30:18.425180',22,610,5,'http://localhost:8081/uploads/avatar_934571b3-c5de-47ce-b859-812ad89b4fc2_Screenshot 2026-01-14 144757.png','Hưng lọ vươngg',1),(4,'tốt','2026-03-03 16:34:04.919659',26,612,5,'http://localhost:8081/uploads/avatar_cus_953d43ef-d381-486e-a1a5-d85ba091d008_Screenshot 2026-01-31 165421.png','Hưng lọ vươngg',1),(5,'tốt','2026-03-05 08:26:49.286548',30,2239,5,'http://localhost:8081/uploads/avatar_cus_953d43ef-d381-486e-a1a5-d85ba091d008_Screenshot 2026-01-31 165421.png','Hưnglv',1),(11,'tốt','2026-08-15 07:16:10.346993',63,580,5,'http://localhost:8081/uploads/avatar_6fb94f97-6a7d-41e5-9df7-b0a5b9e072d5_Gato meme.jpg','Hưng',18),(12,'dùng rất tốt','2026-08-15 07:39:28.279593',66,593,5,'http://localhost:8081/uploads/avatar_6fb94f97-6a7d-41e5-9df7-b0a5b9e072d5_Gato meme.jpg','Hưng',18),(13,'cũng được','2026-08-15 07:39:39.317018',65,580,5,'http://localhost:8081/uploads/avatar_6fb94f97-6a7d-41e5-9df7-b0a5b9e072d5_Gato meme.jpg','Hưng',18),(17,'tốt','2026-08-20 11:32:57.678859',115,2246,5,'','N. T. Nga',0),(18,'tốt','2026-08-20 11:44:53.450321',116,2247,5,'','N. T. Nga',0),(19,'tệ','2026-08-20 11:45:31.425027',116,2246,2,'','N. T. Nga',0),(20,'Khá tệ, Sản phẩm không tốt','2026-09-07 22:52:57.809685',173,2066,2,'','Ng v hưng',0),(21,'Sản phẩm tốt','2026-09-07 23:07:42.001883',174,593,5,'','Ngọc Hà',0),(22,'Sản phẩm không tốt','2026-09-07 23:07:54.290875',174,587,3,'','Ngọc Hà',0),(23,'Sản phẩm dùng mượt mà','2026-09-07 23:17:49.851139',175,587,5,'http://localhost:8081/uploads/avatar_a4027437-7411-4951-add9-2c11dd76512b_Cat ?.jpg','Ng V Hưng',23),(24,'đúng mẫu tôi yêu thích, tản nhiệt mát','2026-09-07 23:18:47.476632',175,593,5,'http://localhost:8081/uploads/avatar_a4027437-7411-4951-add9-2c11dd76512b_Cat ?.jpg','Ng V Hưng',23),(25,'đúng mẫu tôi yêu thích, tản nhiệt mát','2026-09-07 23:18:55.156815',175,612,4,'http://localhost:8081/uploads/avatar_a4027437-7411-4951-add9-2c11dd76512b_Cat ?.jpg','Ng V Hưng',23),(26,'đúng mẫu tôi yêu thích, tản nhiệt mát','2026-09-07 23:19:00.847897',175,608,5,'http://localhost:8081/uploads/avatar_a4027437-7411-4951-add9-2c11dd76512b_Cat ?.jpg','Ng V Hưng',23);
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-23 22:32:43
