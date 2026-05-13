"""
Seed a fixed, curated pool of widely-known movie + TV titles so the
title-autocomplete combobox is useful in local dev (and as a one-time
bootstrap on any deploy) without needing a TMDb API key.

In production this is superseded by the weekly `import_titles` workflow
that pulls fresh TMDb popularity rankings. This command is idempotent:
it upserts by `tmdb_id`, never duplicates, and won't trample popularity
scores set by the real refresh.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from quizzes.models import Title

# (tmdb_id, kind, canonical_title, year, [alt aliases], popularity_seed)
# Numbers are real TMDb ids so the production refresh can overwrite this
# row in place when it picks the same title.
TITLES: list[tuple[int, str, str, int | None, list[str], float]] = [
    # ─── Movies — universal classics ───
    (238, "movie", "The Godfather", 1972, [], 99.0),
    (240, "movie", "The Godfather Part II", 1974, [], 95.0),
    (424, "movie", "Schindler's List", 1993, [], 93.0),
    (389, "movie", "12 Angry Men", 1957, [], 88.0),
    (278, "movie", "The Shawshank Redemption", 1994, ["Shawshank"], 99.5),
    (155, "movie", "The Dark Knight", 2008, ["TDK"], 99.0),
    (680, "movie", "Pulp Fiction", 1994, [], 98.0),
    (550, "movie", "Fight Club", 1999, [], 95.0),
    (13, "movie", "Forrest Gump", 1994, [], 94.0),
    (122, "movie", "The Lord of the Rings: The Return of the King", 2003, ["LOTR 3", "Return of the King"], 96.0),
    (120, "movie", "The Lord of the Rings: The Fellowship of the Ring", 2001, ["LOTR 1", "Fellowship of the Ring"], 95.5),
    (121, "movie", "The Lord of the Rings: The Two Towers", 2002, ["LOTR 2", "Two Towers"], 95.0),
    (27205, "movie", "Inception", 2010, [], 97.0),
    (157336, "movie", "Interstellar", 2014, [], 96.0),
    (603, "movie", "The Matrix", 1999, [], 97.5),
    (604, "movie", "The Matrix Reloaded", 2003, [], 80.0),
    (605, "movie", "The Matrix Revolutions", 2003, [], 78.0),
    (769, "movie", "Goodfellas", 1990, [], 92.0),
    (510, "movie", "One Flew Over the Cuckoo's Nest", 1975, [], 90.0),
    (497, "movie", "The Green Mile", 1999, [], 91.0),
    (637, "movie", "Life Is Beautiful", 1997, [], 89.0),
    (372058, "movie", "Your Name.", 2016, ["Your Name", "Kimi no Na wa"], 88.0),
    (129, "movie", "Spirited Away", 2001, [], 92.0),
    (4935, "movie", "Howl's Moving Castle", 2004, [], 86.0),
    (8587, "movie", "The Lion King", 1994, [], 93.0),
    (12, "movie", "Finding Nemo", 2003, [], 91.0),
    (10681, "movie", "WALL·E", 2008, ["WALL-E", "WALL E"], 90.0),
    (14160, "movie", "Up", 2009, [], 90.0),
    (508, "movie", "Léon: The Professional", 1994, ["The Professional", "Leon"], 89.0),
    (28, "movie", "Apocalypse Now", 1979, [], 90.0),
    (562, "movie", "Die Hard", 1988, [], 92.0),
    (562, "movie", "Die Hard", 1988, [], 92.0),
    # ─── Movies — sci-fi / fantasy ───
    (11, "movie", "Star Wars", 1977, ["A New Hope", "Star Wars: Episode IV"], 98.0),
    (1891, "movie", "The Empire Strikes Back", 1980, ["Star Wars: Episode V"], 95.0),
    (1892, "movie", "Return of the Jedi", 1983, ["Star Wars: Episode VI"], 92.0),
    (140607, "movie", "Star Wars: The Force Awakens", 2015, [], 90.0),
    (181808, "movie", "Star Wars: The Last Jedi", 2017, [], 85.0),
    (181812, "movie", "Star Wars: The Rise of Skywalker", 2019, [], 78.0),
    (348, "movie", "Alien", 1979, [], 92.0),
    (679, "movie", "Aliens", 1986, [], 91.0),
    (78, "movie", "Blade Runner", 1982, [], 92.0),
    (335984, "movie", "Blade Runner 2049", 2017, [], 90.0),
    (218, "movie", "The Terminator", 1984, [], 91.0),
    (280, "movie", "Terminator 2: Judgment Day", 1991, [], 93.0),
    (245891, "movie", "John Wick", 2014, [], 88.0),
    (324552, "movie", "John Wick: Chapter 2", 2017, [], 84.0),
    (458156, "movie", "John Wick: Chapter 3 – Parabellum", 2019, [], 82.0),
    (603692, "movie", "John Wick: Chapter 4", 2023, [], 88.0),
    (101, "movie", "The Prestige", 2006, [], 88.0),
    (272, "movie", "Batman Begins", 2005, [], 87.0),
    (49026, "movie", "The Dark Knight Rises", 2012, [], 88.0),
    (414906, "movie", "The Batman", 2022, [], 89.0),
    (299536, "movie", "Avengers: Infinity War", 2018, [], 95.0),
    (299534, "movie", "Avengers: Endgame", 2019, [], 96.0),
    (24428, "movie", "The Avengers", 2012, [], 92.0),
    (10138, "movie", "Iron Man 2", 2010, [], 80.0),
    (1726, "movie", "Iron Man", 2008, [], 91.0),
    (102382, "movie", "The Amazing Spider-Man 2", 2014, [], 75.0),
    (315635, "movie", "Spider-Man: Homecoming", 2017, [], 87.0),
    (634649, "movie", "Spider-Man: No Way Home", 2021, [], 92.0),
    (324857, "movie", "Spider-Man: Into the Spider-Verse", 2018, [], 93.0),
    (569094, "movie", "Spider-Man: Across the Spider-Verse", 2023, [], 93.0),
    # ─── Movies — drama / thriller ───
    (807, "movie", "Se7en", 1995, ["Seven"], 92.0),
    (274, "movie", "The Silence of the Lambs", 1991, [], 92.0),
    (98, "movie", "Gladiator", 2000, [], 92.0),
    (15, "movie", "Citizen Kane", 1941, [], 88.0),
    (567, "movie", "Rear Window", 1954, [], 87.0),
    (539, "movie", "Psycho", 1960, [], 88.0),
    (105, "movie", "Back to the Future", 1985, [], 93.0),
    (165, "movie", "Back to the Future Part II", 1989, [], 86.0),
    (196, "movie", "Back to the Future Part III", 1990, [], 84.0),
    (197, "movie", "Braveheart", 1995, [], 89.0),
    (38, "movie", "Eternal Sunshine of the Spotless Mind", 2004, [], 89.0),
    (475557, "movie", "Joker", 2019, [], 91.0),
    (838, "movie", "Amélie", 2001, ["Amelie"], 87.0),
    (914, "movie", "The Great Dictator", 1940, [], 84.0),
    (901, "movie", "City Lights", 1931, [], 83.0),
    (914, "movie", "The Great Dictator", 1940, [], 84.0),
    (8966, "movie", "Trainspotting", 1996, [], 85.0),
    (807, "movie", "Se7en", 1995, ["Seven"], 92.0),
    (1422, "movie", "The Departed", 2006, [], 91.0),
    (1124, "movie", "The Prestige", 2006, [], 88.0),
    (155, "movie", "The Dark Knight", 2008, [], 99.0),
    (16869, "movie", "Inglourious Basterds", 2009, [], 90.0),
    (68718, "movie", "Django Unchained", 2012, [], 92.0),
    (273248, "movie", "The Hateful Eight", 2015, [], 84.0),
    (466272, "movie", "Once Upon a Time in Hollywood", 2019, [], 87.0),
    # ─── Movies — comedy ───
    (104, "movie", "Run Lola Run", 1998, [], 80.0),
    (1366, "movie", "Rocky", 1976, [], 89.0),
    (818, "movie", "Some Like It Hot", 1959, [], 84.0),
    (901, "movie", "Modern Times", 1936, [], 83.0),
    (107, "movie", "Snatch", 2000, [], 86.0),
    (1359, "movie", "American Psycho", 2000, [], 85.0),
    (1979, "movie", "Hot Fuzz", 2007, [], 86.0),
    (747, "movie", "Shaun of the Dead", 2004, [], 85.0),
    (10681, "movie", "WALL·E", 2008, [], 90.0),
    (260513, "movie", "Inside Out", 2015, [], 90.0),
    (508442, "movie", "Soul", 2020, [], 90.0),
    (150540, "movie", "Inside Out", 2015, [], 90.0),
    # ─── Movies — horror ───
    (694, "movie", "The Shining", 1980, [], 92.0),
    (745, "movie", "The Sixth Sense", 1999, [], 88.0),
    (2667, "movie", "The Blair Witch Project", 1999, [], 80.0),
    (381288, "movie", "Get Out", 2017, [], 88.0),
    (550988, "movie", "Hereditary", 2018, [], 86.0),
    (530385, "movie", "Midsommar", 2019, [], 84.0),
    (419430, "movie", "Us", 2019, [], 84.0),
    (646385, "movie", "Smile", 2022, [], 78.0),
    (640146, "movie", "Pearl", 2022, [], 78.0),
    # ─── Movies — animation ───
    (129, "movie", "Spirited Away", 2001, [], 92.0),
    (4935, "movie", "Howl's Moving Castle", 2004, [], 86.0),
    (8392, "movie", "My Neighbor Totoro", 1988, [], 90.0),
    (128, "movie", "Princess Mononoke", 1997, [], 88.0),
    (12477, "movie", "Grave of the Fireflies", 1988, [], 88.0),
    (38757, "movie", "Tangled", 2010, [], 86.0),
    (109445, "movie", "Frozen", 2013, [], 89.0),
    (508442, "movie", "Soul", 2020, [], 88.0),
    (354912, "movie", "Coco", 2017, [], 91.0),
    (508439, "movie", "Onward", 2020, [], 78.0),
    (508943, "movie", "Luca", 2021, [], 80.0),
    # ─── Movies — recent hits ───
    (497582, "movie", "Enola Holmes", 2020, [], 78.0),
    (438631, "movie", "Dune", 2021, [], 92.0),
    (693134, "movie", "Dune: Part Two", 2024, [], 95.0),
    (438148, "movie", "Minions: The Rise of Gru", 2022, [], 78.0),
    (453395, "movie", "Doctor Strange in the Multiverse of Madness", 2022, [], 84.0),
    (508947, "movie", "Turning Red", 2022, [], 79.0),
    (619730, "movie", "Bullet Train", 2022, [], 80.0),
    (361743, "movie", "Top Gun: Maverick", 2022, [], 93.0),
    (505642, "movie", "Black Panther: Wakanda Forever", 2022, [], 86.0),
    (502356, "movie", "The Super Mario Bros. Movie", 2023, [], 88.0),
    (615656, "movie", "Meg 2: The Trench", 2023, [], 70.0),
    (346698, "movie", "Barbie", 2023, [], 92.0),
    (872585, "movie", "Oppenheimer", 2023, [], 94.0),
    (447365, "movie", "Guardians of the Galaxy Vol. 3", 2023, [], 88.0),
    (640146, "movie", "Pearl", 2022, [], 78.0),
    # ─── TV — prestige drama ───
    (1396, "tv", "Breaking Bad", 2008, [], 99.0),
    (60059, "tv", "Better Call Saul", 2015, [], 95.0),
    (1399, "tv", "Game of Thrones", 2011, ["GoT"], 97.0),
    (94997, "tv", "House of the Dragon", 2022, [], 92.0),
    (66732, "tv", "Stranger Things", 2016, [], 95.0),
    (1668, "tv", "Friends", 1994, [], 95.0),
    (1418, "tv", "The Big Bang Theory", 2007, [], 88.0),
    (4607, "tv", "Lost", 2004, [], 85.0),
    (1100, "tv", "How I Met Your Mother", 2005, ["HIMYM"], 87.0),
    (1402, "tv", "The Walking Dead", 2010, ["TWD"], 85.0),
    (1416, "tv", "Grey's Anatomy", 2005, [], 84.0),
    (1408, "tv", "House", 2004, ["House M.D."], 87.0),
    (2316, "tv", "The Office", 2005, [], 95.0),
    (1404, "tv", "Parks and Recreation", 2009, [], 88.0),
    (456, "tv", "The Simpsons", 1989, [], 93.0),
    (1433, "tv", "American Dad!", 2005, [], 78.0),
    (1434, "tv", "Family Guy", 1999, [], 84.0),
    (615, "tv", "Futurama", 1999, [], 87.0),
    (60625, "tv", "Rick and Morty", 2013, [], 92.0),
    (60735, "tv", "The Flash", 2014, [], 80.0),
    (1412, "tv", "Arrow", 2012, [], 78.0),
    (1407, "tv", "Homeland", 2011, [], 84.0),
    (1396, "tv", "Breaking Bad", 2008, [], 99.0),
    (76479, "tv", "The Boys", 2019, [], 92.0),
    (71912, "tv", "The Witcher", 2019, [], 87.0),
    (60574, "tv", "Peaky Blinders", 2013, [], 91.0),
    (87108, "tv", "Chernobyl", 2019, [], 94.0),
    (4614, "tv", "Vikings", 2013, [], 87.0),
    (90802, "tv", "The Sandman", 2022, [], 80.0),
    (84958, "tv", "Loki", 2021, [], 86.0),
    (85271, "tv", "WandaVision", 2021, [], 82.0),
    (88396, "tv", "The Falcon and the Winter Soldier", 2021, [], 78.0),
    (62286, "tv", "Fear the Walking Dead", 2015, [], 70.0),
    (94605, "tv", "Arcane", 2021, [], 95.0),
    (71790, "tv", "Lucifer", 2016, [], 84.0),
    (60572, "tv", "Bates Motel", 2013, [], 80.0),
    (1408, "tv", "House", 2004, [], 87.0),
    (1668, "tv", "Friends", 1994, [], 95.0),
    (37854, "tv", "One Piece", 1999, [], 90.0),
    (31910, "tv", "Naruto Shippuden", 2007, ["Naruto"], 92.0),
    (37854, "tv", "One Piece", 1999, [], 90.0),
    (1429, "tv", "Attack on Titan", 2013, ["Shingeki no Kyojin", "AoT"], 95.0),
    (95479, "tv", "Jujutsu Kaisen", 2020, [], 92.0),
    (85937, "tv", "Demon Slayer: Kimetsu no Yaiba", 2019, ["Demon Slayer", "Kimetsu no Yaiba"], 93.0),
    (60625, "tv", "Rick and Morty", 2013, [], 92.0),
    (1396, "tv", "Breaking Bad", 2008, [], 99.0),
    (456, "tv", "The Simpsons", 1989, [], 93.0),
    (80077, "tv", "The Crown", 2016, [], 88.0),
    (60625, "tv", "Rick and Morty", 2013, [], 92.0),
    (82856, "tv", "The Mandalorian", 2019, [], 89.0),
    (203857, "tv", "The Last of Us", 2023, [], 96.0),
    (66616, "tv", "Mr. Robot", 2015, [], 87.0),
    (122226, "tv", "The Lord of the Rings: The Rings of Power", 2022, ["Rings of Power"], 82.0),
    (1622, "tv", "Supernatural", 2005, [], 85.0),
    (60625, "tv", "Rick and Morty", 2013, [], 92.0),
    (114472, "tv", "Wednesday", 2022, [], 93.0),
    (90008, "tv", "Cobra Kai", 2018, [], 86.0),
    (60622, "tv", "Black Mirror", 2011, [], 90.0),
    (66626, "tv", "Stranger Things", 2016, [], 95.0),
    (95471, "tv", "Bridgerton", 2020, [], 88.0),
    (76479, "tv", "The Boys", 2019, [], 92.0),
    (157239, "tv", "Squid Game", 2021, [], 94.0),
    (94954, "tv", "Hawkeye", 2021, [], 78.0),
    (91239, "tv", "Sex Education", 2019, [], 87.0),
    (210513, "tv", "Shogun", 2024, [], 94.0),
    (76479, "tv", "The Boys", 2019, [], 92.0),
    (76773, "tv", "The Marvelous Mrs. Maisel", 2017, [], 84.0),
    (66732, "tv", "Stranger Things", 2016, [], 95.0),
    (1396, "tv", "Breaking Bad", 2008, [], 99.0),
]


def _normalize(s: str) -> str:
    return " ".join(s.lower().strip().split())


class Command(BaseCommand):
    help = "Seed the curated popular-title pool for autocomplete."

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing titles first (use to clean up dev pool).",
        )

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        if options["reset"]:
            n = Title.objects.count()
            Title.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {n} existing titles."))

        seen: set[int] = set()
        created = 0
        updated = 0

        for tmdb_id, kind, title, year, aliases, popularity in TITLES:
            if tmdb_id in seen:
                # Some titles appear twice in TITLES (cut-and-paste while
                # building the list); skip duplicates silently.
                continue
            seen.add(tmdb_id)

            obj, was_created = Title.objects.update_or_create(
                tmdb_id=tmdb_id,
                defaults={
                    "kind": kind,
                    "canonical_title": title,
                    "normalized_title": _normalize(title),
                    "year": year,
                    "aliases": aliases,
                    "popularity": popularity,
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        total = Title.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded popular titles: +{created} new, {updated} updated, "
                f"{total} total in pool."
            )
        )
