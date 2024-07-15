(async () => {
    const app = new PIXI.Application();
    await app.init({ background: '#ffffff', resizeTo: window });

    // Append the application canvas to the document body
    document.body.appendChild(app.canvas);

    // Field background
    const backgroundImage = await PIXI.Assets.load('assets/background.png');
    const background = new PIXI.Sprite(backgroundImage);
    background.width = app.screen.width;
    background.height = app.screen.height;
    background.alpha = 0.50;

    // Options for how objects interact
    // How fast the pad moves and looses speed
    const movementSpeed = 0.01;
    const dampeningValue = 0.95;

    // How fast horisontally ball start moving
    const ballStartSpeed = 5;

    // ball speedup factor
    const ballSpeedup = 1.001;
    //ball curve dampening
    const ballCurveDamp = 0.99;
    // ball Curve strength for changing direction
    const curveDirectionChangingFactor = 0.03;

    function getCenter(obj) {
        const bounds = obj.getBounds();
        const center = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2
        };
        return center;
    }

    // Test For Hit
    // A basic AABB check between two different squares
    function testForBallProximity(ball, pad) {
        const padBounds = pad.getBounds();
        const ballCenter = getCenter(ball);

        return (
            ballCenter.x - ball.radius < padBounds.x + padBounds.width
            && ballCenter.x + ball.radius > padBounds.x
            && ballCenter.y - ball.radius < padBounds.y + padBounds.height
            && ballCenter.y + ball.radius > padBounds.y
        );
    }

    // Calculate the distance between two given points
    function distanceBetweenTwoPoints(p1, p2) {
        const a = p1.x - p2.x;
        const b = p1.y - p2.y;

        return Math.hypot(a, b);
    }

    function rotateAccelerationByCurveValue(acceleration, curve) {
        acceleration.x = acceleration.x * Math.cos(curve * curveDirectionChangingFactor) - acceleration.y * Math.sin(curve * curveDirectionChangingFactor);
        acceleration.y = acceleration.x * Math.sin(curve * curveDirectionChangingFactor) + acceleration.y * Math.cos(curve * curveDirectionChangingFactor);
    }

    // The ball
    const ballTexture = await PIXI.Assets.load('assets/ball.png');
    const ball = new PIXI.Sprite(ballTexture);
    ball.width = 40;
    ball.height = 40;
    ball.radius = 20;
    ball.anchor.set(0.5, 0.5);
    ball.position.set((app.screen.width - 100) / 2 - ball.width / 2, (app.screen.height - 100) / 2 - ball.height / 2);
    ball.acceleration = new PIXI.Point(0);
    ball.mass = 3;
    ball.curve = 0;

    // The pad on left side
    const redPadTexture = await PIXI.Assets.load('assets/red_pad.png');
    const redPad = new PIXI.Sprite(redPadTexture);

    redPad.width = 75;
    redPad.height = 225;
    redPad.position.set(redPad.width / 2, app.screen.height / 2 - redPad.height / 2);
    redPad.acceleration = new PIXI.Point(0);
    redPad.mass = 1;

    // The pad on right side
    const bluePadTexture = await PIXI.Assets.load('assets/blue_pad.png');
    const bluePad = new PIXI.Sprite(bluePadTexture);

    bluePad.width = 75;
    bluePad.height = 225;
    bluePad.position.set(app.screen.width - bluePad.width * 1.5, app.screen.height / 2 - bluePad.height / 2);
    bluePad.acceleration = new PIXI.Point(0);
    bluePad.mass = 1;

    // Score text
    var redScore = 0;
    var blueScore = 0;
    const scoreTextStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 156,
        fontWeight: 'bold',
        fill: 'aaaaaa90',
        alpha: 0.8,
        stroke: { color: '#4a1850', width: 5, join: 'round' },
        dropShadow: {
            color: '#eeeeee',
            blur: 4,
            angle: Math.PI / 6,
            distance: 6,
        },
        wordWrap: false,
    });

    const scoreText = new PIXI.Text({
        text: '0 : 0',
        style: scoreTextStyle,
    });

    scoreText.x = app.screen.width / 2 - scoreText.width / 2;
    scoreText.y = app.screen.height / 2 - scoreText.height / 2;

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
    ball.acceleration.set(ballStartSpeed * plusOrMinus, Math.random() * plusOrMinus);

    const pivotVisualisation = new PIXI.Sprite(PIXI.Texture.WHITE); // TODO: remove

    var mouseMovementEnabled = false;
    // Listen for animate update
    app.ticker.add((time) => {
        const delta = time.deltaTime;

        // pad acceleration dampening
        redPad.acceleration.set(0, redPad.acceleration.y * dampeningValue);
        bluePad.acceleration.set(0, bluePad.acceleration.y * dampeningValue);

        // ball acceleration up and curve dampening
        ball.acceleration.x *= ballSpeedup;
        ball.curve *= ballCurveDamp;

        // Check whether the ball ever touches upper and lower border
        // If so, reverse acceleration in that direction
        const ballCenter = getCenter(ball);
        if (ballCenter.y - ball.radius <= 0) {
            ball.y += 1;
            ball.acceleration.y = -ball.acceleration.y;
        }
        if (ballCenter.y + ball.radius >= app.screen.height) {
            ball.y -= 1;
            ball.acceleration.y = -ball.acceleration.y;
        }

        // Check whether the ball ever touches left border
        // If so, give ball and point to the blue pad player
        if (ballCenter.x - ball.radius < 0) {
            ball.x = app.screen.width / 2;
            ball.acceleration.y = 0;
            ball.acceleration.x = ballStartSpeed;
            blueScore++;
            scoreText.text = redScore + " : " + blueScore;
            scoreText.x = app.screen.width / 2 - scoreText.width / 2;
            scoreText.y = app.screen.height / 2 - scoreText.height / 2;

        }

        // Check whether the ball ever touches right border
        // If so, give ball and point to the red pad player
        if (ballCenter.x + ball.radius > app.screen.width) {
            ball.x = app.screen.width / 2;
            ball.acceleration.y = 0;
            ball.acceleration.x = -ballStartSpeed;
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
        if (testForBallProximity(ball, redPad)) {
            ball.acceleration.set(-ball.acceleration.x, ball.acceleration.y * 0.5 + 0.1 * ((ball.y + ball.height / 2) - (redPad.y + redPad.height / 2)));
            ball.curve = -redPad.acceleration.y * curveDirectionChangingFactor;
        }
        if (testForBallProximity(ball, bluePad)) {
            ball.acceleration.set(-ball.acceleration.x, ball.acceleration.y * 0.5 + 0.1 * ((ball.y + ball.height / 2) - (bluePad.y + bluePad.height / 2)));
            ball.curve = bluePad.acceleration.y * curveDirectionChangingFactor;
        }

        //rotate ball
        ball.rotation += ball.curve * delta;

        // change ball direction based on curve
        rotateAccelerationByCurveValue(ball.acceleration, ball.curve);

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
    app.stage.addChild(background, scoreText, redPad, bluePad, ball);
})();