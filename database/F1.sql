CREATE TABLE `circuito` (
  `id_circuito` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(30) NOT NULL,
  `paese` VARCHAR(30) NOT NULL,
  `lunghezza_tracciato` DECIMAL(5, 2) NOT NULL,
  `tipologia` VARCHAR(20) NOT NULL,
  `indice_imprevedibilità` DECIMAL(4, 2) NOT NULL,
  PRIMARY KEY (`id_circuito`)
);

CREATE TABLE `gara` (
  `id_gara` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome_gara_premio` VARCHAR(30) NOT NULL,
  `data` DATE NOT NULL,
  `id_circuito_FK` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_gara`),
  KEY `id_circuito_FK` (`id_circuito_FK`)
);

CREATE TABLE `pilota` (
  `id_pilota` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(20) NOT NULL,
  `cognome` VARCHAR(30) NOT NULL,
  `nazionalità` VARCHAR(20) NOT NULL,
  `numero` INT NOT NULL,
  `id_scuderia_FK` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_pilota`),
  KEY `id_scuderia_FK` (`id_scuderia_FK`)
);

CREATE TABLE `pitstop` (
  `id_pitstop` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `numero_stop` TINYINT UNSIGNED NOT NULL,
  `tempo_pitstop` DECIMAL(5, 2) NOT NULL,
  `id_pilota_FK` INT UNSIGNED NOT NULL,
  `id_gara_FK` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_pitstop`),
  KEY `id_pilota` (`id_pilota_FK`, `id_gara_FK`),
  KEY `id_gara` (`id_gara_FK`)
);

CREATE TABLE `risultato` (
  `id_risultato` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `posizione_arrivo` TINYINT UNSIGNED NOT NULL,
  `punti_ottenuti` TINYINT UNSIGNED NOT NULL,
  `giro_veloce` TINYINT NOT NULL,
  `tempo_totale` VARCHAR(15) NOT NULL,
  `id_pilota_FK` INT UNSIGNED NOT NULL,
  `id_gara_FK` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_risultato`),
  KEY `id_pilota_FK` (`id_pilota_FK`, `id_gara_FK`),
  KEY `id_gara_FK` (`id_gara_FK`)
);

CREATE TABLE `scuderia` (
  `id_scuderia` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(30) NOT NULL,
  `nazionalità_s` VARCHAR(20) NOT NULL,
  `punti_totali` INT UNSIGNED NOT NULL,
  `indice_potenza` DECIMAL(50, 0) NOT NULL,
  PRIMARY KEY (`id_scuderia`)
);

ALTER TABLE `circuito`
  ADD CONSTRAINT `circuito_ibfk_1`
  FOREIGN KEY (`id_circuito`)
  REFERENCES `gara` (`id_circuito_FK`);

ALTER TABLE `pilota`
  ADD CONSTRAINT `pilota_ibfk_1`
  FOREIGN KEY (`id_pilota`)
  REFERENCES `risultato` (`id_pilota_FK`);

ALTER TABLE `pitstop`
  ADD CONSTRAINT `pitstop_ibfk_2`
  FOREIGN KEY (`id_pilota_FK`)
  REFERENCES `pilota` (`id_pilota`);

ALTER TABLE `risultato`
  ADD CONSTRAINT `risultato_ibfk_1`
  FOREIGN KEY (`id_gara_FK`)
  REFERENCES `gara` (`id_gara`);

ALTER TABLE `scuderia`
  ADD CONSTRAINT `scuderia_ibfk_1`
  FOREIGN KEY (`id_scuderia`)
  REFERENCES `pilota` (`id_scuderia_FK`);
