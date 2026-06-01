#  Ghost Night

<img width="1359" height="633" alt="Captura de pantalla (924)" src="https://github.com/user-attachments/assets/e8821edc-a357-4945-88c7-564668a68359" />

> **Estado: En desarrollo activo** 

Un roguelike de mazmorras 2D desarrollado desde cero con HTML5 Canvas, CSS y JavaScript puro.

##  Descripción

Ghost Night es un juego de exploración de mazmorras con generación procedural de mapas, combate en tiempo real y múltiples enemigos. El jugador debe sobrevivir 15 pisos de mazmorra hasta enfrentarse al jefe final: **La Manticora**.

##  Gameplay

El mapa se genera usando **Cellular Automata**, creando cuevas orgánicas únicas en cada partida. Las antorchas iluminan las paredes de roca y la niebla de guerra obliga al jugador a explorar cada rincón.

##  Características implementadas
<img width="1359" height="633" alt="Captura de pantalla (924)" src="https://github.com/user-attachments/assets/439d8b64-626d-4d84-8628-678c490689be" />

### Jugador
- 6 héroes con stats distintos (HP, velocidad, arma inicial)
- 3 skins seleccionables: Guerrero, Mago y Lagarto
- Animación de idle y movimiento
- Sistema de vida con 6 corazones
- Invulnerabilidad al recibir daño

### Armas
- 9 armas: Pistola, Escopeta, AK-47, Laser, Cohete, Espada, Mazo, Cuchillo y Sartén
- Armas de fuego y cuerpo a cuerpo
- Sistema de intercambio con tecla **E**
- Al recoger un arma nueva, la anterior queda en el suelo

### Enemigos
- 5 tipos: Slime, Murciélago, Gremlin, Ogro y Manticora (jefe final)
- IA distinta por tipo: el murciélago atraviesa paredes, el gremlin dispara, el ogro embiste
- Sprites animados del pack 0x72 DungeonTileset II
- Barras de vida sobre cada enemigo

### Mapa
- Generación procedural con **Cellular Automata**
- Cuevas orgánicas sin cuartos cuadrados
- Tiles de roca y suelo del pack Dungeon Crawl Stone Soup
- Antorchas animadas con luz cálida
- Niebla de guerra con radio de visión
- 15 pisos con dificultad creciente

### Sistema de juego
- Cofres de plata y dorado con loot garantizado
- Pociones de vida en el suelo
- Guardado de progreso con localStorage
- Mapa de niveles con progreso desbloqueado
- Menú animado con partículas flotantes y título con glow

##  Controles

| Tecla | Acción |
|-------|--------|
| WASD / Flechas | Mover |
| Mouse | Apuntar |
| Click | Disparar / Atacar |
| E | Recoger arma |
| ESC | Pausar |
| R | Reiniciar tras Game Over |

## Tecnologías

- HTML5 Canvas
- CSS3
- JavaScript ES6+ (sin frameworks)

##  Créditos de Assets

- **Tiles y personajes**: [0x72 DungeonTileset II](https://0x72.itch.io/dungeontileset-ii) — CC0
- **Tiles de mazmorra**: [Dungeon Crawl Stone Soup Tiles](https://opengameart.org/content/dungeon-crawl-32x32-tiles) — CC0

##  En desarrollo

- [ ] Modo historia con 5 capítulos
- [ ] Más skins desbloqueables
- [ ] Sistema de experiencia
- [ ] Sonidos y música
- [ ] Minimapa
- [ ] Más tipos de enemigos y jefes

##  Autor

**javierdev06** — [GitHub](https://github.com/javierdev06)
