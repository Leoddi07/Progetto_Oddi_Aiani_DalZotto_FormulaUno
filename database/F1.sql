CREATE TABLE `circuito` (
  `id_circuito` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(30) NOT NULL,
  `paese` VARCHAR(30) NOT NULL,
  `lunghezza_tracciato` DECIMAL(5,2) NOT NULL,
  `tipologia` VARCHAR(20) NOT NULL,
  `indice_imprevedibilita` DECIMAL(4,2) NOT NULL,
  PRIMARY KEY (`id_circuito`)
);

CREATE TABLE `scuderia` (
  `id_scuderia` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(30) NOT NULL,
  `nazionalita` VARCHAR(20) NOT NULL,
  `punti_totali` INT UNSIGNED NOT NULL DEFAULT 0,
  `indice_potenza` DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (`id_scuderia`)
);

CREATE TABLE `pilota` (
  `id_pilota` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(20) NOT NULL,
  `cognome` VARCHAR(30) NOT NULL,
  `nazionalita` VARCHAR(20) NOT NULL,
  `numero` INT UNSIGNED NOT NULL,
  `id_scuderia_FK` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_pilota`),
  CONSTRAINT `pilota_ibfk_1`
    FOREIGN KEY (`id_scuderia_FK`) REFERENCES `scuderia` (`id_scuderia`)
);

CREATE TABLE `gara` (
  `id_gara` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome_gara_premio` VARCHAR(30) NOT NULL,
  `data` DATE NOT NULL,
  `id_circuito_FK` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_gara`),
  CONSTRAINT `gara_ibfk_1`
    FOREIGN KEY (`id_circuito_FK`) REFERENCES `circuito` (`id_circuito`)
);

CREATE TABLE `risultato` (
  `id_risultato` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `posizione_arrivo` TINYINT UNSIGNED NOT NULL,
  `punti_ottenuti` TINYINT UNSIGNED NOT NULL,
  `giro_veloce` TINYINT(1) NOT NULL DEFAULT 0,
  `tempo_totale` VARCHAR(15) NOT NULL,
  `id_pilota_FK` INT UNSIGNED NOT NULL,
  `id_gara_FK` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_risultato`),
  CONSTRAINT `risultato_ibfk_1`
    FOREIGN KEY (`id_pilota_FK`) REFERENCES `pilota` (`id_pilota`),
  CONSTRAINT `risultato_ibfk_2`
    FOREIGN KEY (`id_gara_FK`) REFERENCES `gara` (`id_gara`)
);

CREATE TABLE `pitstop` (
  `id_pitstop` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `numero_stop` TINYINT UNSIGNED NOT NULL,
  `tempo_pitstop` DECIMAL(5,2) NOT NULL,
  `id_pilota_FK` INT UNSIGNED NOT NULL,
  `id_gara_FK` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_pitstop`),
  CONSTRAINT `pitstop_ibfk_1`
    FOREIGN KEY (`id_pilota_FK`) REFERENCES `pilota` (`id_pilota`),
  CONSTRAINT `pitstop_ibfk_2`
    FOREIGN KEY (`id_gara_FK`) REFERENCES `gara` (`id_gara`)
);

CREATE TABLE `utente` (
  `id_utente` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(30) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `ruolo` ENUM('utente', 'admin') NOT NULL DEFAULT 'utente',
  PRIMARY KEY (`id_utente`)
);