(async () => {
    // Create a new application
    const app = new PIXI.Application();

    // Initialize the application
    await app.init({ background: '#111', resizeTo: window });

    // Append the application canvas to the document body
    document.body.appendChild(app.canvas);

    // Options for how objects interact
    // How fast the pad moves and looses speed
    const movementSpeed = 0.03;
    const dampeningValue = 0.95;

    // Test For Hit
    // A basic AABB check between two different squares
    function testForAABB(object1, object2) {
        const bounds1 = object1.getBounds();
        const bounds2 = object2.getBounds();

        return (
            bounds1.x < bounds2.x + bounds2.width
            && bounds1.x + bounds1.width > bounds2.x
            && bounds1.y < bounds2.y + bounds2.height
            && bounds1.y + bounds1.height > bounds2.y
        );
    }

    // Calculate the distance between two given points
    function distanceBetweenTwoPoints(p1, p2) {
        const a = p1.x - p2.x;
        const b = p1.y - p2.y;

        return Math.hypot(a, b);
    }

    // The ball
    const ball = new PIXI.Sprite(PIXI.Texture.WHITE);

    ball.width = 40;
    ball.height = 40;
    ball.position.set((app.screen.width - 100) / 2 - ball.width / 2, (app.screen.height - 100) / 2 - ball.height / 2);
    ball.tint = 0x00ff00;
    ball.acceleration = new PIXI.Point(0);
    ball.mass = 3;

    // The pad on left side
    const redPad = new PIXI.Sprite(PIXI.Texture.WHITE);

    redPad.width = 30;
    redPad.height = 150;
    redPad.position.set(0, app.screen.height / 2 - redPad.height / 2);
    redPad.tint = 0xff0000;
    redPad.acceleration = new PIXI.Point(0);
    redPad.mass = 1;

    // The pad on right side
    const bluePad = new PIXI.Sprite(PIXI.Texture.WHITE);

    bluePad.width = 30;
    bluePad.height = 150;
    bluePad.position.set(app.screen.width - bluePad.width, app.screen.height / 2 - bluePad.height / 2);
    bluePad.tint = 0x0000bb;
    bluePad.acceleration = new PIXI.Point(0);
    bluePad.mass = 1;

    // Score
    var redScore = 0;
    var blueScore = 0;
    const scoreTextStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 156,
        // fontStyle: 'italic',
        fontWeight: 'bold',
        fill: '111111',
        stroke: { color: '#4a1850', width: 5, join: 'round' },
        dropShadow: {
            color: '#eeeeee',
            blur: 4,
            angle: Math.PI / 6,
            distance: 6,
        },
        wordWrap: false,
        // wordWrapWidth: 440,
    });

    const scoreText = new PIXI.Text({
        text: '0 : 0',
        style: scoreTextStyle,
    });

    scoreText.x = app.screen.width / 2 - scoreText.width / 2;
    scoreText.y = app.screen.height / 2 - scoreText.height / 2;

    app.stage.addChild(scoreText);

    ///////////////////

    const mouseCoords = { x: 0, y: app.screen.height / 2 };

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('mousemove', (event) => {
        mouseCoords.x = event.global.x;
        mouseCoords.y = event.global.y;
    });

    window.addEventListener("keyup", keyUpHandler);
    window.addEventListener("keydown", keyDownHandler);

    const movementState = {
        redUp: 0,
        redDown: 0,
        blueUp: 0,
        blueDown: 0
    };

    function keyUpHandler(event) {
        if (event.key == 'w' || event.key == 'W') {
            movementState.redUp = 0;
        }
        if (event.key == 's' || event.key == 'S') {
            movementState.redDown = 0;
        }
        if (event.key == 'i' || event.key == 'I') {
            movementState.blueUp = 0;
        }
        if (event.key == 'k' || event.key == 'K') {
            movementState.blueDown = 0;
        }
    }

    function keyDownHandler(event) {
        if (event.key == 'w' || event.key == 'W') {
            movementState.redUp = 1;
        }
        if (event.key == 's' || event.key == 'S') {
            movementState.redDown = 1;
        }
        if (event.key == 'i' || event.key == 'I') {
            movementState.blueUp = 1;
        }
        if (event.key == 'k' || event.key == 'K') {
            movementState.blueDown = 1;
        }
    }

    // Start the ball
    var plusOrMinus = Math.random() < 0.5 ? -1 : 1;
    ball.acceleration.set(3 * plusOrMinus, Math.random());

    var mouseMovementEnabled = false;
    // Listen for animate update
    app.ticker.add((time) => {
        const delta = time.deltaTime;

        // pad acceleration dampening
        redPad.acceleration.set(0, redPad.acceleration.y * dampeningValue);
        bluePad.acceleration.set(0, bluePad.acceleration.y * dampeningValue);

        // ball acceleration up
        ball.acceleration.x = ball.acceleration.x * 1.0001;

        // Check whether the ball ever touches uper and lower border
        // If so, reverse acceleration in that direction
        if (ball.y <= 0) {
            ball.y = 1;
            ball.acceleration.y = -ball.acceleration.y;
        }
        if (ball.y >= app.screen.height - ball.height) {
            ball.y = app.screen.height - ball.height - 1;
            ball.acceleration.y = -ball.acceleration.y;
        }

        // Check whether the ball ever touches left border
        // If so, give ball and point to the blue pad player
        if (ball.x < 0) {
            ball.acceleration.y = 0;
            ball.acceleration.x = 3;
            blueScore++;
            scoreText.text = redScore + " : " + blueScore;
            scoreText.x = app.screen.width / 2 - scoreText.width / 2;
            scoreText.y = app.screen.height / 2 - scoreText.height / 2;

        }

        // Check whether the ball ever touches right border
        // If so, give ball and point to the red pad player
        if (ball.x > app.screen.width - ball.width) {
            ball.acceleration.y = 0;
            ball.acceleration.x = -3;
            redScore++;
            scoreText.text = redScore + " : " + blueScore;
            scoreText.x = app.screen.width / 2 - scoreText.width / 2;
            scoreText.y = app.screen.height / 2 - scoreText.height / 2;
        }

        // If the ball pops out of the cordon, it pops back into the middle
        if (
            ball.x < -30
            || ball.x > app.screen.width + 30
            || ball.y < -30
            || ball.y > app.screen.height + 30
        ) {
            ball.position.set((app.screen.width) / 2 - ball.width / 2, (app.screen.height) / 2 - ball.height / 2);
        }

        // If the mouse is off screen, then don't update any further
        if (
            mouseMovementEnabled &&
            (app.screen.width > mouseCoords.x
                || mouseCoords.x > 0
                || app.screen.height > mouseCoords.y
                || mouseCoords.y > 0)
        ) {
            // Get the pad center point
            const padCenterPosition = new PIXI.Point(0, ((redPad.y + redPad.height * 0.5) + (bluePad.y + bluePad.height * 0.5)) / 2);

            // Calculate the direction vector between the mouse pointer and
            // the red square
            const toMouseDirection = new PIXI.Point(
                mouseCoords.x - padCenterPosition.x,
                mouseCoords.y - padCenterPosition.y,
            );

            // Use the above to figure out the angle that direction has
            const angleToMouse = Math.atan2(toMouseDirection.y, toMouseDirection.x);

            // Figure out the speed the pads should be travelling by, as a
            // function of how far away from the mouse pointer the pads are
            const distMouseRedSquare = distanceBetweenTwoPoints(mouseCoords, padCenterPosition);
            const padSpeed = distMouseRedSquare * movementSpeed;

            // Calculate the acceleration of the red square
            redPad.acceleration.set(0, Math.sin(angleToMouse) * padSpeed);
            bluePad.acceleration.set(0, Math.sin(angleToMouse) * padSpeed);
        } else {
            redPad.acceleration.set(0, redPad.acceleration.y + movementState.redUp * -1 + movementState.redDown);
            bluePad.acceleration.set(0, bluePad.acceleration.y + movementState.blueUp * -1 + movementState.blueDown);
        }

        // collisions check
        if (testForAABB(ball, redPad)) {
            ball.acceleration.set(-ball.acceleration.x, ball.acceleration.y * 0.5 + 0.1 * ((ball.y + ball.height / 2) - (redPad.y + redPad.height / 2)));
        }
        if (testForAABB(ball, bluePad)) {
            ball.acceleration.set(-ball.acceleration.x, ball.acceleration.y * 0.5 + 0.1 * ((ball.y + ball.height / 2) - (bluePad.y + bluePad.height / 2)));
        }

        // move ball
        ball.x += ball.acceleration.x * delta;
        ball.y += ball.acceleration.y * delta;

        // move red pad
        redPad.y += redPad.acceleration.y * delta;
        if (redPad.y < 0) {
            redPad.y = 0;
            redPad.acceleration.y = 0;
        }
        if (redPad.y > app.screen.height - redPad.height) {
            redPad.y = app.screen.height - redPad.height;
            redPad.acceleration.y = 0;
        }

        // move blue pad
        bluePad.y += bluePad.acceleration.y * delta;
        if (bluePad.y < 0) {
            bluePad.y = 0;
            bluePad.acceleration.y = 0;
        }
        if (bluePad.y > app.screen.height - bluePad.height) {
            bluePad.y = app.screen.height - bluePad.height;
            bluePad.acceleration.y = 0;
        }
    });

    // Add to stage
    app.stage.addChild(redPad, bluePad, ball);
})();