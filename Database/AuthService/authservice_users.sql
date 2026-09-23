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
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` int DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `code_expiry` datetime(6) DEFAULT NULL,
  `is_verified` bit(1) DEFAULT NULL,
  `reset_password_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_points` int DEFAULT NULL,
  `cycle_points` int DEFAULT NULL,
  `membership_tier` enum('BASIC','ELITE','GOLD','SILVER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tier_cycle_start` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (19,'http://localhost:8081/uploads/avatar_fda0f81a-4e1e-409a-8e24-d5e21f075d1a_download (3).jpg','ngvhug001@gmail.com','$2a$10$hs6PfuKDRuqaCiXI/VxOE.fk2T/0tzHAAEGqZyjiBz8MxlWRHHTSy','Ng V. Hưng','0347981282',1,'2004-01-02',1,'2026-08-15 10:51:14','2026-09-11 14:37:28','2026-08-31 13:42:34.938503',_binary '',NULL,NULL,2400,7000,'ELITE','2026-09-03 19:00:43.259090'),(21,'http://localhost:8081/uploads/avatar_52612645-9f05-4922-b0ac-4cbcf14cb395_cat with runny nose at hoa hoa season.jpg','cardlord124@gmail.com','$2a$10$97LDG80iyZXmKJMIT6dBlOJQQ2l2mWjdm2k/R8.9PSDi0kfDFleEa','Ng T Ngaa','0394857896',2,NULL,1,'2026-08-31 13:58:02','2026-09-15 15:38:58','2026-09-15 15:53:21.693424',_binary '',NULL,NULL,0,0,'BASIC','2026-09-03 19:00:43.259090'),(22,'http://localhost:8081/uploads/avatar_d696bda2-89bf-496a-b3cc-674fc6eaba37_Gato meme.jpg','ngvhug003@gmail.com','$2a$10$fD1yQCbYanu.Tl8K06zLXeP5kr0JRsBARQ2feM9wu9IOtt7vMgzgC','Nguyễn hưng','0398906879',0,'2003-01-02',1,'2026-09-03 06:38:09','2026-09-05 13:45:36','2026-09-03 06:43:09.280955',_binary '',NULL,NULL,0,0,'BASIC','2026-09-03 19:00:43.259090'),(23,'http://localhost:8081/uploads/avatar_a4027437-7411-4951-add9-2c11dd76512b_Cat ?.jpg','ngvhug004@gmail.com','$2a$10$88XTYIkWjCLDEEAuYLkxiOUEUjIupYmXGVH9qfdJsZWN4JuhZQDve','Ng V Hưng','0365984873',2,NULL,1,'2026-09-03 19:00:43','2026-09-22 16:38:07','2026-09-17 16:43:03.900208',_binary '','555328',NULL,35227,36327,'ELITE','2026-09-03 19:00:43.259090'),(25,NULL,'ngvhuf11@gmail.com','$2a$10$HgqCGdNSeKHHPq6sZF5um.AQO6g/Y5seDlLLRC2nv85fku5aOGj.i','khach hang','0987562458',NULL,NULL,1,'2026-09-05 15:33:43','2026-09-05 15:33:43',NULL,_binary '',NULL,NULL,0,0,'BASIC','2026-09-05 15:33:43.194628'),(26,'http://localhost:8081/uploads/avatar_a0b1779f-c196-49ac-94a9-c5b52f873d8d_Phòng_khám_bệnh_không_người_202608241727.jpeg','ngocha999@gmail.com','$2a$10$zz8PH.pc7o.MMcZgv4ybEemOl8PtQ7O8SKFx3LD..BLR2XWZILA/G','Ngọc hà','0347982154',NULL,NULL,1,'2026-09-06 21:50:17','2026-09-15 17:20:27','2026-09-15 17:35:26.886534',_binary '','745784',NULL,900,1000,'SILVER','2026-09-06 21:50:17.255581'),(27,NULL,'ngvhug009@gmail.com','$2a$10$GG9DDabj2opVvRyZcSkEFOtZNoMxo7qbT0SYnr5dfu8Pkvf6qWvQe','Hungg','0398980150',NULL,NULL,1,'2026-09-10 18:31:53','2026-09-10 19:40:34','2026-09-10 18:36:53.230384',_binary '',NULL,NULL,50,100,'BASIC','2026-09-10 18:31:53.230384'),(28,NULL,'ngvhug005@gmail.com','$2a$10$b.mPo2EKInWdz6gR0AvQweosA6ilUAJQk0NPxv//ZA.494YhVN3r.','Hưng','0398906150',NULL,NULL,1,'2026-09-12 11:10:07','2026-09-12 11:10:41','2026-09-12 11:15:06.495715',_binary '',NULL,NULL,0,0,'BASIC','2026-09-12 11:10:06.495715'),(29,NULL,'besdas@gmail.com','$2a$10$o9yhiUVRW80W9.3QCb9iGeFlDlV2nCDPiu6NU.itGU7Uix9uskFE.','Bé đá','0398548725',NULL,NULL,1,'2026-09-15 19:52:09','2026-09-15 19:52:09',NULL,_binary '',NULL,NULL,0,0,'BASIC','2026-09-15 19:52:08.523979'),(30,NULL,'g@gmail.com','$2a$10$DDGd62aec/.ypy6G3SESeuGuf.uMZNGCwRpMq.0pSic1mdAqAJCF2','H','1234124',NULL,NULL,1,'2026-09-15 19:53:09','2026-09-15 19:53:09',NULL,_binary '',NULL,NULL,0,0,'BASIC','2026-09-15 19:53:08.923014');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
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
